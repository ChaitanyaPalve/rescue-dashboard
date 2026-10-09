import React, { useState, useEffect, useRef } from "react"
import {
  AreaId,
  AreaInfo,
  NodeInfo,
  LogEntry,
  TriggerType,
  ViewMode,
} from "./types"
import IsoCampusMap from "./components/IsoCampusMap"
import NodeFlowDiagram from "./components/NodeFlowDiagram"
import SystemHeader from "./components/SystemHeader"
import TriggerControls from "./components/TriggerControls"
import AuditPanel from "./components/AuditPanel"
import EventLogPanel from "./components/EventLogPanel"
import { soundController } from "./utils/audio"
import {
  subscribeToNodes,
  subscribeToEmergency,
  triggerWebEmergency,
  clearWebEmergency,
  syncDemoModeToFirebase,
  subscribeToDemoMode,
} from "./firebase-sync"
import {
  sendBackendEmergency,
  sendBackendDemoStep,
  resetBackendSystem,
  subscribeToBackendStream,
  blockBackendExit,
  fetchSystemState,
} from "./services/api"

const now = () => {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":")
}

const mapTriggerToCategory = (type: TriggerType): string => {
  switch (type) {
    case "fire":
      return "smoke"
    case "sos":
      return "sos"
    case "co2":
      return "co2"
    case "motion":
      return "intrusion"
    case "manual":
      return "drill"
    default:
      return "smoke"
  }
}

export default function App() {
  // ── 1. Areas State ──────────────────────────────────────────────────────────
  const [areas, setAreas] = useState<Record<AreaId, AreaInfo>>({
    classA: {
      id: "classA",
      label: "Class A",
      subLabel: "West Wing Main Classroom",
      nodeId: "node1",
      nodeLabel: "Node 1",
      isTriggered: false,
      occupants: 24,
      temperature: 22.4,
      co2Level: 410,
    },
    classB: {
      id: "classB",
      label: "Class B",
      subLabel: "East Wing Lab Classroom",
      nodeId: "node2",
      nodeLabel: "Node 2",
      isTriggered: false,
      occupants: 18,
      temperature: 21.8,
      co2Level: 395,
    },
    exitA: {
      id: "exitA",
      label: "Exit A",
      subLabel: "South Emergency Portal",
      nodeId: "node3",
      nodeLabel: "Node 3",
      isTriggered: false,
      occupants: 0,
      temperature: 20.5,
      co2Level: 380,
    },
    exitB: {
      id: "exitB",
      label: "Exit B",
      subLabel: "North Emergency Portal",
      nodeId: "node3",
      nodeLabel: "Node 3",
      isTriggered: false,
      occupants: 0,
      temperature: 20.2,
      co2Level: 375,
    },
  })

  // ── 2. Nodes State ──────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<NodeInfo[]>([
    {
      id: "node1",
      label: "Node 1",
      role: "Class A Telemetry Sentinel",
      monitoredAreas: ["classA"],
      battery: 98,
      signalStrength: 100,
      status: "normal",
    },
    {
      id: "node2",
      label: "Node 2",
      role: "Class B Telemetry Sentinel",
      monitoredAreas: ["classB"],
      battery: 95,
      signalStrength: 98,
      status: "normal",
    },
    {
      id: "node3",
      label: "Node 3",
      role: "Dual Exit Controller Hub",
      monitoredAreas: ["exitA", "exitB"],
      battery: 99,
      signalStrength: 100,
      status: "normal",
    },
  ])

  // ── 3. Configuration & UI State ─────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("isometric")
  const [selectedAreaId, setSelectedAreaId] = useState<AreaId | null>(null)
  const [selectedTriggerType, setSelectedTriggerType] =
    useState<TriggerType>("fire")
  const [isolationMode, setIsolationMode] = useState<"single" | "multi">(
    "single",
  )
  const [isSoundEnabled, setIsSoundEnabled] = useState(false)
  const [isAutoplayRunning, setIsAutoplayRunning] = useState(false)
  const [autoplayStep, setAutoplayStep] = useState(0)
  const [backendStreamConnected, setBackendStreamConnected] = useState(false)

  // Emergency state with complete incident telemetry
  const [emergency, setEmergency] = useState<{
    active?: boolean
    node?: string
    type?: string
    event_category?: string
    sender_name?: string
    lat?: number
    lon?: number
    message?: string
    timestamp?: number
  }>({ active: false })

  // Helper to determine if a hardware node is actively streaming live telemetry (within 90s)
  const isNodeOnline = (node?: any): boolean => {
    if (!node) return false
    if (node.status === "offline" || node.status === "disconnected") return false
    if (!node.last_seen) return false
    const lastSeenMs =
      typeof node.last_seen === "number" && node.last_seen < 1e11
        ? node.last_seen * 1000
        : Number(node.last_seen)
    if (isNaN(lastSeenMs) || lastSeenMs <= 0) return false
    return Date.now() - lastSeenMs < 90 * 1000
  }

  // Live telemetry nodes — starts EMPTY without hardcoded fallback values
  const [liveNodes, setLiveNodes] = useState<{
    node001?: { temp?: number; gas?: number; motion?: boolean; battery?: number; status?: string; last_seen?: number }
    node002?: { temp?: number; gas?: number; accelX?: number; motion?: boolean; battery?: number; status?: string; last_seen?: number }
    node003?: { peopleInside?: number; battery?: number; status?: string; last_seen?: number }
    [key: string]: any
  }>({})

  // Tick state to re-evaluate connectivity timeouts every 5 seconds
  const [nowTick, setNowTick] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  // ── 4. Audit & Event Logs ───────────────────────────────────────────────────
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      time: now(),
      message:
        "ResQMesh AI Command Center Initialized. Dual-Sync (Render FastAPI + Firebase RTDB) active.",
      kind: "info",
    },
    {
      id: "2",
      time: now(),
      message: "Telemetry Sentinel listening. Awaiting live hardware transmissions.",
      kind: "info",
    },
  ])

  const addLog = (
    msg: string,
    kind: LogEntry["kind"] = "info",
    areaId?: AreaId,
    nodeId?: NodeInfo["id"],
  ) => {
    setLogs((prev) => [
      {
        id: String(Date.now() + Math.random()),
        time: now(),
        message: msg,
        kind,
        areaId,
        nodeId,
      },
      ...prev.slice(0, 49),
    ])
  }

  // ── Sound Toggle ────────────────────────────────────────────────────────────
  const handleToggleSound = () => {
    const next = !isSoundEnabled
    setIsSoundEnabled(next)
    soundController.enabled = next
    addLog(`Audio synthesizer & voice alerts: ${next ? "ENABLED" : "MUTED"}`, "info")
  }

  // ── Sync Node Statuses with Area Trigger States & Live Hardware Connectivity ─
  useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => {
        const hasTrigger = node.monitoredAreas.some(
          (aid) => areas[aid].isTriggered,
        )
        const liveKey =
          node.id === "node1"
            ? "node001"
            : node.id === "node2"
              ? "node002"
              : "node003"
        const liveData = liveNodes[liveKey]
        const online = isNodeOnline(liveData)

        return {
          ...node,
          status: hasTrigger ? "alert" : online ? "normal" : "offline",
        }
      }),
    )
  }, [areas, liveNodes, nowTick])

  // ── Trigger Specific Area ───────────────────────────────────────────────────
  const handleTriggerSpecificArea = (areaId: AreaId) => {
    const current = areas[areaId]
    const willBeTriggered =
      isolationMode === "single" ? true : !current.isTriggered
    const category = mapTriggerToCategory(selectedTriggerType)

    setAreas((prev) => {
      const next = { ...prev }
      if (isolationMode === "single") {
        ;(Object.keys(next) as AreaId[]).forEach((id) => {
          if (id === areaId) {
            next[id] = {
              ...next[id],
              isTriggered: true,
              triggerType: selectedTriggerType,
              temperature: selectedTriggerType === "fire" ? 48.2 : 23.5,
              co2Level: selectedTriggerType === "co2" ? 1200 : 420,
            }
          } else {
            next[id] = {
              ...next[id],
              isTriggered: false,
              temperature:
                id === "classA" ? 22.4 : id === "classB" ? 21.8 : 20.4,
              co2Level: id === "classA" ? 410 : id === "classB" ? 395 : 380,
            }
          }
        })
      } else {
        next[areaId] = {
          ...next[areaId],
          isTriggered: willBeTriggered,
          triggerType: willBeTriggered ? selectedTriggerType : undefined,
          temperature: willBeTriggered ? 45.0 : 22.0,
          co2Level: willBeTriggered ? 1100 : 400,
        }
      }
      return next
    })

    if (willBeTriggered) {
      soundController.playAlertSound()
      const targetNodeId =
        areaId === "classA"
          ? "node001"
          : areaId === "classB"
            ? "node002"
            : "node003"

      const alertMsg = `🚨 ${selectedTriggerType.toUpperCase()} Alert on ${current.label} (${current.nodeLabel})`

      // 1. Dispatch to FastAPI Backend
      sendBackendEmergency({
        active: true,
        node: targetNodeId,
        type: areaId === "classA" ? "class_a" : areaId === "classB" ? "class_b" : areaId,
        event_category: category,
        event_type: category,
        sender_name: `${current.label} Sentinel`,
        lat: areaId === "classA" ? 18.5204 : areaId === "classB" ? 18.5208 : 18.5201,
        lon: areaId === "classA" ? 73.8567 : areaId === "classB" ? 73.8572 : 73.8562,
        message: alertMsg,
      })

      // Sync backend exit blockages based on zone rules
      if (areaId === "classA" || areaId === "exitA") {
        blockBackendExit("EXIT_A", true, category)
      } else if (areaId === "classB" || areaId === "exitB") {
        blockBackendExit("EXIT_B", true, category)
      }

      // 2. Dispatch to Firebase RTDB & Firestore
      triggerWebEmergency(targetNodeId, areaId, {
        event_category: category,
        sender_name: `${current.label} Sentinel`,
        message: alertMsg,
      })

      // 3. Audio Voice Announcement
      soundController.speakVoiceAlert(alertMsg)

      addLog(
        `🚨 TRIGGER ACTIVATED: ${current.label} (Monitored by ${current.nodeLabel}) [Category: ${category.toUpperCase()}]. Other areas UNCHANGED.`,
        "error",
        areaId,
        current.nodeId,
      )
    } else {
      soundController.playResetSound()
      if (areaId === "classA" || areaId === "exitA") {
        blockBackendExit("EXIT_A", false)
      } else if (areaId === "classB" || areaId === "exitB") {
        blockBackendExit("EXIT_B", false)
      }

      addLog(
        `✔ Trigger cleared on ${current.label}. Restored to normal status.`,
        "success",
        areaId,
        current.nodeId,
      )
    }
  }

  // ── Trigger Both Exits via Node 3 ───────────────────────────────────────────
  const handleTriggerBothExits = () => {
    const category = mapTriggerToCategory(selectedTriggerType)
    setAreas((prev) => {
      const next = { ...prev }
      if (isolationMode === "single") {
        next.classA = {
          ...next.classA,
          isTriggered: false,
          temperature: 22.4,
          co2Level: 410,
        }
        next.classB = {
          ...next.classB,
          isTriggered: false,
          temperature: 21.8,
          co2Level: 395,
        }
      }
      next.exitA = {
        ...next.exitA,
        isTriggered: true,
        triggerType: selectedTriggerType,
        temperature: 42.0,
        co2Level: 950,
      }
      next.exitB = {
        ...next.exitB,
        isTriggered: true,
        triggerType: selectedTriggerType,
        temperature: 42.0,
        co2Level: 950,
      }
      return next
    })

    const alertMsg = "🚨 DUAL EXIT ALERT: Exit A & Exit B Blocked via Node 3 Hub"

    // Dispatch to Backend & Firebase
    sendBackendEmergency({
      active: true,
      node: "node003",
      type: "both_exits",
      event_category: category,
      event_type: category,
      sender_name: "Dual Exit Hub Controller",
      lat: 18.5205,
      lon: 73.8564,
      message: alertMsg,
    })

    blockBackendExit("EXIT_A", true, category)
    blockBackendExit("EXIT_B", true, category)

    triggerWebEmergency("node003", "both_exits", {
      event_category: category,
      sender_name: "Dual Exit Hub Controller",
      message: alertMsg,
    })

    soundController.playAlertSound()
    soundController.speakVoiceAlert(alertMsg)

    addLog(
      `⚠️ DUAL EXIT TRIGGER: Exit A & Exit B highlighted in RED via Node 3 [${category.toUpperCase()}]. Class A & B remain UNCHANGED.`,
      "error",
      "exitA",
      "node3",
    )
  }

  // ── Reset System to Normal / Safe ───────────────────────────────────────────
  const handleResetAll = () => {
    setAreas({
      classA: {
        id: "classA",
        label: "Class A",
        subLabel: "West Wing Main Classroom",
        nodeId: "node1",
        nodeLabel: "Node 1",
        isTriggered: false,
        occupants: 24,
        temperature: 22.4,
        co2Level: 410,
      },
      classB: {
        id: "classB",
        label: "Class B",
        subLabel: "East Wing Lab Classroom",
        nodeId: "node2",
        nodeLabel: "Node 2",
        isTriggered: false,
        occupants: 18,
        temperature: 21.8,
        co2Level: 395,
      },
      exitA: {
        id: "exitA",
        label: "Exit A",
        subLabel: "South Emergency Portal",
        nodeId: "node3",
        nodeLabel: "Node 3",
        isTriggered: false,
        occupants: 0,
        temperature: 20.5,
        co2Level: 380,
      },
      exitB: {
        id: "exitB",
        label: "Exit B",
        subLabel: "North Emergency Portal",
        nodeId: "node3",
        nodeLabel: "Node 3",
        isTriggered: false,
        occupants: 0,
        temperature: 20.2,
        co2Level: 375,
      },
    })

    soundController.playResetSound()

    // 1. Reset backend and clear exit blockages
    resetBackendSystem()
    blockBackendExit("EXIT_A", false)
    blockBackendExit("EXIT_B", false)
    sendBackendDemoStep(0, "RESET", false)

    // 2. Clear Firebase
    clearWebEmergency()
    syncDemoModeToFirebase(false, 0, "Nominal Monitoring")

    setEmergency({ active: false })
    addLog(
      "🔄 System Reset: All triggers cleared. Backend & Firebase synchronized to SAFE nominal state.",
      "info",
    )
  }

  // ── Trigger Web SOS to Firebase & Backend ───────────────────────────────────
  const handleTriggerWebSOS = () => {
    const alertMsg = "🆘 Manual SOS Signal Triggered from Web Command Center"

    sendBackendEmergency({
      active: true,
      node: "WEB_DASHBOARD",
      type: "sos",
      event_category: "sos",
      event_type: "sos",
      sender_name: "Web Command Center",
      lat: 18.5204,
      lon: 73.8567,
      message: alertMsg,
    })

    blockBackendExit("EXIT_A", true, "sos")

    triggerWebEmergency("WEB_DASHBOARD", "sos", {
      event_category: "sos",
      sender_name: "Web Command Center",
      message: alertMsg,
    })

    handleTriggerSpecificArea("classA")
  }

  const handleClearAlert = () => {
    handleResetAll()
  }

  // ── Real-Time Dual-Sync Subscriptions (SSE + Firebase) ──────────────────────
  useEffect(() => {
    // 0. Pre-fetch initial backend state immediately (0ms delay)
    fetchSystemState().then((serverState) => {
      if (!serverState) return
      if (serverState.nodes) {
        setLiveNodes((prev) => ({ ...prev, ...serverState.nodes }))
        setAreas((prev) => {
          const next = { ...prev }
          const n1 = serverState.nodes.node001
          const n2 = serverState.nodes.node002
          const n3 = serverState.nodes.node003

          if (n1) {
            if (n1.temp !== undefined) next.classA = { ...next.classA, temperature: Number(n1.temp) }
            if (n1.gas !== undefined) next.classA = { ...next.classA, co2Level: Number(n1.gas) }
          }
          if (n2) {
            if (n2.temp !== undefined) next.classB = { ...next.classB, temperature: Number(n2.temp) }
            if (n2.gas !== undefined) next.classB = { ...next.classB, co2Level: Number(n2.gas) }
          }
          if (n3 && n3.peopleInside !== undefined) {
            next.exitA = { ...next.exitA, occupants: Number(n3.peopleInside) }
          }
          return next
        })
      }
      if (serverState.emergency) {
        setEmergency(serverState.emergency)
      }
    })

    // 1. Fast 0ms Server-Sent Events (SSE) Stream from FastAPI Backend
    const unsubscribeSSE = subscribeToBackendStream(
      (serverState) => {
        if (!serverState) return
        setBackendStreamConnected(true)

        // Telemetry Update
        if (serverState.nodes) {
          setLiveNodes((prev) => ({ ...prev, ...serverState.nodes }))

          setAreas((prev) => {
            const next = { ...prev }
            const n1 = serverState.nodes.node001
            const n2 = serverState.nodes.node002
            const n3 = serverState.nodes.node003

            if (n1) {
              if (n1.temp !== undefined) next.classA = { ...next.classA, temperature: Number(n1.temp) }
              if (n1.gas !== undefined) next.classA = { ...next.classA, co2Level: Number(n1.gas) }
            }
            if (n2) {
              if (n2.temp !== undefined) next.classB = { ...next.classB, temperature: Number(n2.temp) }
              if (n2.gas !== undefined) next.classB = { ...next.classB, co2Level: Number(n2.gas) }
            }
            if (n3 && n3.peopleInside !== undefined) {
              next.exitA = { ...next.exitA, occupants: Number(n3.peopleInside) }
            }
            return next
          })
        }

        // Emergency Update
        if (serverState.emergency) {
          setEmergency(serverState.emergency)
          if (serverState.emergency.active && serverState.emergency.message) {
            soundController.speakVoiceAlert(serverState.emergency.message)
          }
        }
      },
      () => {
        setBackendStreamConnected(false)
      },
    )

    // 2. Firebase RTDB Emergency Subscriptions
    const unsubscribeEmergency = subscribeToEmergency((emergencyData) => {
      const data = emergencyData || { active: false }
      setEmergency(data)

      if (data.active) {
        soundController.playAlertSound()
        if (data.message) {
          soundController.speakVoiceAlert(data.message)
        }
        addLog(
          `🚨 EMERGENCY RECEIVED: ${data.sender_name || data.node || "REMOTE"} [${(data.event_category || data.type || "SOS").toUpperCase()}]`,
          "error",
        )
        const nodeStr = (data.node || "").toLowerCase()
        if (
          nodeStr.includes("node001") ||
          nodeStr.includes("node 1") ||
          nodeStr.includes("classa")
        ) {
          handleTriggerSpecificArea("classA")
        } else if (
          nodeStr.includes("node002") ||
          nodeStr.includes("node 2") ||
          nodeStr.includes("classb")
        ) {
          handleTriggerSpecificArea("classB")
        } else if (
          nodeStr.includes("node003") ||
          nodeStr.includes("node 3") ||
          nodeStr.includes("exit")
        ) {
          handleTriggerBothExits()
        }
      }
    })

    // 3. Firebase RTDB Nodes Telemetry Subscriptions
    const unsubscribeNodes = subscribeToNodes((nodesData) => {
      if (nodesData) {
        setLiveNodes((prev) => ({ ...prev, ...nodesData }))
        const n1 =
          nodesData.node001 ||
          nodesData.node1 ||
          nodesData["node-1"] ||
          nodesData["Node 1"] ||
          nodesData.Node1
        const n2 =
          nodesData.node002 ||
          nodesData.node2 ||
          nodesData["node-2"] ||
          nodesData["Node 2"] ||
          nodesData.Node2
        const n3 =
          nodesData.node003 ||
          nodesData.node3 ||
          nodesData["node-3"] ||
          nodesData["Node 3"] ||
          nodesData.Node3

        setAreas((prev) => {
          const next = { ...prev }
          if (n1) {
            if (n1.temp !== undefined) next.classA = { ...next.classA, temperature: Number(n1.temp) }
            if (n1.gas !== undefined) next.classA = { ...next.classA, co2Level: Number(n1.gas) }
          }
          if (n2) {
            if (n2.temp !== undefined) next.classB = { ...next.classB, temperature: Number(n2.temp) }
            if (n2.gas !== undefined) next.classB = { ...next.classB, co2Level: Number(n2.gas) }
          }
          if (n3 && n3.peopleInside !== undefined) {
            next.exitA = { ...next.exitA, occupants: Number(n3.peopleInside) }
          }
          return next
        })
      }
    })

    // 4. Remote Demo Mode listener
    const unsubscribeDemo = subscribeToDemoMode((demoData) => {
      if (demoData && typeof demoData.current_step === "number") {
        setAutoplayStep(demoData.current_step)
        if (demoData.active && !isAutoplayRunning) {
          setIsAutoplayRunning(true)
        }
      }
    })

    return () => {
      unsubscribeSSE()
      unsubscribeEmergency()
      unsubscribeNodes()
      unsubscribeDemo()
    }
  }, [])

  // ── Autoplay Sequential Verification Demo ───────────────────────────────────
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isAutoplayRunning) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current)
      return
    }

    const steps = [
      // Step 1: Trigger Class A (Smoke hazard in Class A -> Exit A blocked, Exit B open)
      () => {
        setAutoplayStep(1)
        sendBackendDemoStep(1, "TRIGGER_CLASS_A", true)
        syncDemoModeToFirebase(true, 1, "Step 1: Smoke Hazard Detected in Class A")
        handleTriggerSpecificArea("classA")
      },
      // Step 2: Trigger Class B (Air quality spike in Class B -> Exit B blocked, Exit A open)
      () => {
        setAutoplayStep(2)
        sendBackendDemoStep(2, "TRIGGER_CLASS_B", true)
        syncDemoModeToFirebase(true, 2, "Step 2: Air Quality Spike in Class B Lab")
        handleTriggerSpecificArea("classB")
      },
      // Step 3: Trigger Exit A (South Exit A portal compromised -> Reroute to Exit B)
      () => {
        setAutoplayStep(3)
        sendBackendDemoStep(3, "TRIGGER_EXIT_A", true)
        syncDemoModeToFirebase(true, 3, "Step 3: South Exit A Compromised — Rerouting to Exit B")
        handleTriggerSpecificArea("exitA")
      },
      // Step 4: Trigger Both Exits (North & South portals obstructed -> Both Exits Blocked)
      () => {
        setAutoplayStep(4)
        sendBackendDemoStep(4, "TRIGGER_BOTH_EXITS", true)
        syncDemoModeToFirebase(true, 4, "Step 4: North Exit B Portal Obstruction Alert — Both Exits Blocked")
        handleTriggerBothExits()
      },
      // Step 5: Reset All (Evacuation Clear & All Systems Normalized)
      () => {
        setAutoplayStep(5)
        sendBackendDemoStep(5, "RESET_ALL", false)
        syncDemoModeToFirebase(false, 0, "Step 5: Evacuation Clear & All Systems Normalized")
        handleResetAll()
      },
    ]

    let currentStepIndex = 0
    steps[0]()

    autoplayTimerRef.current = setInterval(() => {
      currentStepIndex += 1
      if (currentStepIndex < steps.length) {
        steps[currentStepIndex]()
      } else {
        setIsAutoplayRunning(false)
        setAutoplayStep(0)
        sendBackendDemoStep(0, "RESET", false)
        syncDemoModeToFirebase(false, 0, "Nominal Monitoring")
        if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current)
      }
    }, 3200)

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current)
    }
  }, [isAutoplayRunning])

  const handleToggleAutoplay = () => {
    if (isAutoplayRunning) {
      setIsAutoplayRunning(false)
      setAutoplayStep(0)
      sendBackendDemoStep(0, "RESET", false)
      syncDemoModeToFirebase(false, 0, "Nominal Monitoring")
      handleResetAll()
    } else {
      setIsAutoplayRunning(true)
      setAutoplayStep(1)
    }
  }

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        background: "#04070d",
        color: "#c8d8e8",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ── 1. SYSTEM TOP HEADER ── */}
      <SystemHeader
        areas={areas}
        nodes={nodes}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      {/* ── 🚨 Live Emergency Incident Feed Banner ── */}
      {emergency.active && (
        <div
          style={{
            backgroundColor: "#B71C1C",
            color: "#FFFFFF",
            padding: "10px 20px",
            fontWeight: "bold",
            fontSize: "14px",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(183,28,28,0.6)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
            <span
              style={{
                background: "#FF1744",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              {emergency.event_category || emergency.type || "EMERGENCY"}
            </span>
            <span>
              <strong>Sender:</strong> {emergency.sender_name || emergency.node || "REMOTE"} |{" "}
              <strong>GPS:</strong> {emergency.lat?.toFixed(4) || "18.5204"},{" "}
              {emergency.lon?.toFixed(4) || "73.8567"} —{" "}
              <span style={{ color: "#FFE082" }}>{emergency.message || "Active Alert"}</span>
            </span>
          </div>
          <button
            onClick={handleClearAlert}
            style={{
              padding: "5px 14px",
              cursor: "pointer",
              background: "#FFFFFF",
              color: "#B71C1C",
              border: "none",
              borderRadius: "4px",
              fontWeight: 700,
              fontSize: "12px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            Clear Alert
          </button>
        </div>
      )}

      {/* ── 2. MAIN WORKSPACE CONTENT ── */}
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        {/* Main Display Canvas (Isometric Map, Flow Diagram, or Split) */}
        <div
          className="flex-1 flex flex-col rounded min-h-0 relative overflow-hidden"
          style={{
            background: "#060b14",
            border: "1px solid rgba(0,200,180,0.12)",
          }}
        >
          {/* 📊 Live Sensor Telemetry Overlay */}
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              zIndex: 30,
              background: "rgba(4, 11, 20, 0.90)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0,200,180,0.25)",
              color: "#e2e8f0",
              padding: "12px 14px",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              minWidth: "270px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: "1px solid rgba(0,200,180,0.15)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#64f5df",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: backendStreamConnected ? "#33d19b" : "#ffb300",
                  }}
                />
                ResQMesh Live Telemetry
              </h3>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  background: backendStreamConnected
                    ? "rgba(51, 209, 155, 0.15)"
                    : "rgba(255, 179, 0, 0.15)",
                  color: backendStreamConnected ? "#33d19b" : "#ffb300",
                  borderRadius: 4,
                  border: backendStreamConnected
                    ? "1px solid rgba(51, 209, 155, 0.3)"
                    : "1px solid rgba(255, 179, 0, 0.3)",
                  fontFamily: "monospace",
                }}
              >
                {backendStreamConnected ? "SSE 0ms Push" : "RTDB Sync"}
              </span>
            </div>

            {(() => {
              const n1 =
                liveNodes.node001 ||
                liveNodes.node1 ||
                liveNodes["node-1"] ||
                liveNodes["Node 1"] ||
                {}
              const n2 =
                liveNodes.node002 ||
                liveNodes.node2 ||
                liveNodes["node-2"] ||
                liveNodes["Node 2"] ||
                {}
              const n3 =
                liveNodes.node003 ||
                liveNodes.node3 ||
                liveNodes["node-3"] ||
                liveNodes["Node 3"] ||
                {}

              const online1 = isNodeOnline(n1)
              const online2 = isNodeOnline(n2)
              const online3 = isNodeOnline(n3)

              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                >
                  {/* Node 1 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "#8ba7b5",
                      background: online1 ? "rgba(0, 230, 180, 0.05)" : "rgba(255, 23, 68, 0.04)",
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: online1 ? "1px solid rgba(0, 230, 180, 0.2)" : "1px solid rgba(255, 23, 68, 0.15)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: online1 ? "#00ffcc" : "#888" }}>
                        {online1 ? "🟢" : "⚪"} Node 001 (A)
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: online1 ? "rgba(0, 255, 204, 0.15)" : "rgba(255, 23, 68, 0.2)",
                          color: online1 ? "#00ffcc" : "#ff4d6d",
                          fontWeight: "bold",
                        }}
                      >
                        {online1 ? "ONLINE" : "DISCONNECTED"}
                      </span>
                    </span>
                    <span>
                      {online1 ? (
                        <>
                          Temp: <strong style={{ color: "#fff" }}>{n1.temp}°C</strong> | Gas:{" "}
                          <strong style={{ color: "#fff" }}>{n1.gas} ppm</strong>
                        </>
                      ) : (
                        <span style={{ color: "#667885", fontStyle: "italic" }}>
                          Temp: -- | Gas: --
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Node 2 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "#8ba7b5",
                      background: online2 ? "rgba(0, 230, 180, 0.05)" : "rgba(255, 23, 68, 0.04)",
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: online2 ? "1px solid rgba(0, 230, 180, 0.2)" : "1px solid rgba(255, 23, 68, 0.15)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: online2 ? "#00ffcc" : "#888" }}>
                        {online2 ? "🔵" : "⚪"} Node 002 (B)
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: online2 ? "rgba(0, 255, 204, 0.15)" : "rgba(255, 23, 68, 0.2)",
                          color: online2 ? "#00ffcc" : "#ff4d6d",
                          fontWeight: "bold",
                        }}
                      >
                        {online2 ? "ONLINE" : "DISCONNECTED"}
                      </span>
                    </span>
                    <span>
                      {online2 ? (
                        <>
                          Temp: <strong style={{ color: "#fff" }}>{n2.temp}°C</strong> | Gas:{" "}
                          <strong style={{ color: "#fff" }}>{n2.gas} ppm</strong>
                          {n2.motion !== undefined && (
                            <> | Motion: <strong style={{ color: "#fff" }}>{n2.motion ? "YES" : "NO"}</strong></>
                          )}
                          {n2.accelX !== undefined && (
                            <> | Tilt: <strong style={{ color: "#fff" }}>{n2.accelX}g</strong></>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "#667885", fontStyle: "italic" }}>
                          Temp: -- | Gas: --
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Node 3 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "#8ba7b5",
                      background: online3 ? "rgba(0, 230, 180, 0.05)" : "rgba(255, 23, 68, 0.04)",
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: online3 ? "1px solid rgba(0, 230, 180, 0.2)" : "1px solid rgba(255, 23, 68, 0.15)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: online3 ? "#00ffcc" : "#888" }}>
                        {online3 ? "🟠" : "⚪"} Node 003 (Exits)
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: online3 ? "rgba(0, 255, 204, 0.15)" : "rgba(255, 23, 68, 0.2)",
                          color: online3 ? "#00ffcc" : "#ff4d6d",
                          fontWeight: "bold",
                        }}
                      >
                        {online3 ? "ONLINE" : "DISCONNECTED"}
                      </span>
                    </span>
                    <span>
                      {online3 ? (
                        <>
                          People Inside:{" "}
                          <strong style={{ color: "#33d19b" }}>
                            {n3.peopleInside ?? 0}
                          </strong>
                        </>
                      ) : (
                        <span style={{ color: "#667885", fontStyle: "italic" }}>
                          People: -- (No Signal)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )
            })()}

            <button
              onClick={handleTriggerWebSOS}
              style={{
                background: "#FF1744",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: 5,
                cursor: "pointer",
                marginTop: 10,
                width: "100%",
                fontWeight: "bold",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: "0 2px 8px rgba(255, 23, 68, 0.4)",
              }}
            >
              🚨 Trigger Web SOS
            </button>
          </div>

          {viewMode === "isometric" && (
            <div className="w-full h-full flex items-center justify-center p-1">
              <IsoCampusMap
                areas={areas}
                nodes={nodes}
                onToggleAreaTrigger={handleTriggerSpecificArea}
                selectedAreaId={selectedAreaId}
                onSelectArea={setSelectedAreaId}
              />
            </div>
          )}

          {viewMode === "flow" && (
            <div className="w-full h-full p-2">
              <NodeFlowDiagram
                areas={areas}
                nodes={nodes}
                onToggleAreaTrigger={handleTriggerSpecificArea}
              />
            </div>
          )}

          {viewMode === "split" && (
            <div className="w-full h-full flex flex-col lg:flex-row gap-2 p-1">
              {/* Left Half: 3D Isometric Campus Map */}
              <div className="flex-1 rounded border border-[rgba(0,200,180,0.1)] flex items-center justify-center p-1 bg-[#040810] min-h-0">
                <IsoCampusMap
                  areas={areas}
                  nodes={nodes}
                  onToggleAreaTrigger={handleTriggerSpecificArea}
                  selectedAreaId={selectedAreaId}
                  onSelectArea={setSelectedAreaId}
                />
              </div>

              {/* Right Half: Node Architecture Flow Diagram */}
              <div className="flex-1 rounded border border-[rgba(0,200,180,0.1)] min-h-0">
                <NodeFlowDiagram
                  areas={areas}
                  nodes={nodes}
                  onToggleAreaTrigger={handleTriggerSpecificArea}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 3. RIGHT SIDEBAR CONTROLS & TELEMETRY ── */}
        <div className="w-80 flex flex-col gap-2 shrink-0 overflow-y-auto">
          {/* Trigger Control Matrix */}
          <TriggerControls
            areas={areas}
            onTriggerSpecificArea={handleTriggerSpecificArea}
            onTriggerBothExits={handleTriggerBothExits}
            onResetAll={handleResetAll}
            selectedTriggerType={selectedTriggerType}
            onChangeTriggerType={setSelectedTriggerType}
            isAutoplayRunning={isAutoplayRunning}
            autoplayStep={autoplayStep}
            onToggleAutoplay={handleToggleAutoplay}
            isSoundEnabled={isSoundEnabled}
            onToggleSound={handleToggleSound}
            isolationMode={isolationMode}
            onToggleIsolationMode={() =>
              setIsolationMode((prev) =>
                prev === "single" ? "multi" : "single",
              )
            }
          />

          {/* Area Isolation & Telemetry Audit Panel */}
          <AuditPanel
            areas={areas}
            nodes={nodes}
            onSelectArea={setSelectedAreaId}
          />

          {/* Event & Telemetry Logs */}
          <EventLogPanel logs={logs} onClearLogs={() => setLogs([])} />
        </div>
      </div>
    </div>
  )
}
