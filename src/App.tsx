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
} from "./firebase-sync"

const now = () => {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":")
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
  const [emergency, setEmergency] = useState<{
    active?: boolean
    node?: string
    type?: string
    timestamp?: number
  }>({ active: false })
  const [liveNodes, setLiveNodes] = useState<{
    node001?: { temp?: number | string; gas?: number | string }
    node002?: {
      gas?: number | string
      accelX?: number | string
      temp?: number | string
    }
    node003?: { peopleInside?: number | string }
    [key: string]: any
  }>({})

  // ── 4. Audit & Event Logs ───────────────────────────────────────────────────
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      time: now(),
      message:
        "System Initialized: Class A → Node 1, Class B → Node 2, Exit A & Exit B → Node 3",
      kind: "info",
    },
    {
      id: "2",
      time: now(),
      message: "All 3 telemetry nodes online. Continuous monitoring engaged.",
      kind: "success",
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
    addLog(`Audio synthesizer feedback: ${next ? "ENABLED" : "MUTED"}`, "info")
  }

  // ── Sync Node Statuses with Area Trigger States ─────────────────────────────
  useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => {
        const hasTrigger = node.monitoredAreas.some(
          (aid) => areas[aid].isTriggered,
        )
        return {
          ...node,
          status: hasTrigger ? "alert" : "normal",
        }
      }),
    )
  }, [areas])

  // ── Trigger Specific Area ───────────────────────────────────────────────────
  const handleTriggerSpecificArea = (areaId: AreaId) => {
    const current = areas[areaId]
    const willBeTriggered =
      isolationMode === "single" ? true : !current.isTriggered

    setAreas((prev) => {
      const next = { ...prev }
      if (isolationMode === "single") {
        // Strict Isolation: Highlight ONLY the specific affected area in RED;
        // ALL other areas remain UNCHANGED.
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
        // Multi-area mode toggle
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
      addLog(
        `🚨 TRIGGER ACTIVATED: ${current.label} (Monitored by ${current.nodeLabel}) highlighted in RED. Other areas UNCHANGED.`,
        "error",
        areaId,
        current.nodeId,
      )
    } else {
      soundController.playResetSound()
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
    setAreas((prev) => {
      const next = { ...prev }
      if (isolationMode === "single") {
        // Keep Class A and Class B completely unchanged
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

    soundController.playAlertSound()
    addLog(
      "⚠️ DUAL EXIT TRIGGER: Exit A & Exit B highlighted in RED via Node 3. Class A and Class B remain UNCHANGED.",
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
    clearWebEmergency()
    setEmergency({ active: false })
    addLog(
      "🔄 System Reset: All triggers cleared. All areas returned to UNCHANGED (Safe) status.",
      "info",
    )
  }

  // ── Trigger Web SOS to Firebase ─────────────────────────────────────────────
  const handleTriggerWebSOS = () => {
    triggerWebEmergency("CAMPUS_WEB", "SOS")
    handleTriggerSpecificArea("classA")
  }

  const handleClearAlert = () => {
    clearWebEmergency()
    handleResetAll()
  }

  // ── Firebase Realtime Subscriptions ─────────────────────────────────────────
  useEffect(() => {
    // 1. Subscribe to live SOS alerts
    const unsubscribeEmergency = subscribeToEmergency((emergencyData) => {
      console.log("🚨 Live Emergency Event:", emergencyData)
      const data = emergencyData || { active: false }
      setEmergency(data)

      if (data.active) {
        soundController.playAlertSound()
        addLog(
          `🚨 FIREBASE EMERGENCY: Active from ${data.node || "REMOTE"} (${data.type || "SOS"})`,
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
        } else {
          handleTriggerSpecificArea("classA")
        }
      } else {
        addLog("✔ Firebase RTDB: Emergency status normal/cleared.", "info")
      }
    })

    // 2. Subscribe to live sensor telemetry from ResQMesh Android nodes
    const unsubscribeNodes = subscribeToNodes((nodesData) => {
      console.log("📊 Live Telemetry Data:", nodesData)
      if (nodesData) {
        setLiveNodes(nodesData)
        setAreas((prev) => {
          const next = { ...prev }
          if (nodesData.node001) {
            if (nodesData.node001.temp !== undefined) {
              next.classA = {
                ...next.classA,
                temperature: Number(nodesData.node001.temp),
              }
            }
            if (nodesData.node001.gas !== undefined) {
              next.classA = {
                ...next.classA,
                co2Level: Number(nodesData.node001.gas),
              }
            }
          }
          if (nodesData.node002) {
            if (nodesData.node002.temp !== undefined) {
              next.classB = {
                ...next.classB,
                temperature: Number(nodesData.node002.temp),
              }
            }
            if (nodesData.node002.gas !== undefined) {
              next.classB = {
                ...next.classB,
                co2Level: Number(nodesData.node002.gas),
              }
            }
          }
          if (
            nodesData.node003 &&
            nodesData.node003.peopleInside !== undefined
          ) {
            next.exitA = {
              ...next.exitA,
              occupants: Number(nodesData.node003.peopleInside),
            }
          }
          return next
        })
      }
    })

    return () => {
      unsubscribeEmergency()
      unsubscribeNodes()
    }
  }, [])

  // ── Autoplay Sequential Verification Demo ───────────────────────────────────
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isAutoplayRunning) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current)
      return
    }

    const steps: () => void[] = [
      // Step 1: Trigger Class A
      () => {
        setAutoplayStep(1)
        handleTriggerSpecificArea("classA")
      },
      // Step 2: Trigger Class B
      () => {
        setAutoplayStep(2)
        handleTriggerSpecificArea("classB")
      },
      // Step 3: Trigger Exit A
      () => {
        setAutoplayStep(3)
        handleTriggerSpecificArea("exitA")
      },
      // Step 4: Trigger Exit B
      () => {
        setAutoplayStep(4)
        handleTriggerSpecificArea("exitB")
      },
      // Step 5: Reset All
      () => {
        setAutoplayStep(5)
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
        if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current)
      }
    }, 2800)

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current)
    }
  }, [isAutoplayRunning])

  const handleToggleAutoplay = () => {
    if (isAutoplayRunning) {
      setIsAutoplayRunning(false)
      setAutoplayStep(0)
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

      {/* ── 🚨 Firebase Live Emergency Banner ── */}
      {emergency.active && (
        <div
          style={{
            backgroundColor: "#D32F2F",
            color: "#FFFFFF",
            padding: "12px 24px",
            fontWeight: "bold",
            fontSize: "16px",
            textAlign: "center",
            boxShadow: "0 4px 14px rgba(211,47,47,0.5)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <span>
            🚨 CAMPUS EMERGENCY ACTIVE! Source: {emergency.node || "REMOTE"} (
            {emergency.type || "SOS"})
          </span>
          <button
            onClick={handleClearAlert}
            style={{
              padding: "6px 14px",
              cursor: "pointer",
              background: "#FFFFFF",
              color: "#D32F2F",
              border: "none",
              borderRadius: "4px",
              fontWeight: 700,
              fontSize: "13px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
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
              background: "rgba(4, 11, 20, 0.88)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0,200,180,0.25)",
              color: "#e2e8f0",
              padding: "12px 14px",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              minWidth: "260px",
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
                    background: "#33d19b",
                  }}
                />
                ResQMesh Live Status
              </h3>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  background: "rgba(51, 209, 155, 0.15)",
                  color: "#33d19b",
                  borderRadius: 4,
                  border: "1px solid rgba(51, 209, 155, 0.3)",
                  fontFamily: "monospace",
                }}
              >
                RTDB Online
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#8ba7b5",
                }}
              >
                <span>🟢 Node 001</span>
                <span>
                  Temp:{" "}
                  <strong style={{ color: "#fff" }}>
                    {liveNodes.node001?.temp ?? "--"}°C
                  </strong>{" "}
                  | Gas:{" "}
                  <strong style={{ color: "#fff" }}>
                    {liveNodes.node001?.gas ?? "--"}
                  </strong>
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#8ba7b5",
                }}
              >
                <span>🔵 Node 002</span>
                <span>
                  Gas:{" "}
                  <strong style={{ color: "#fff" }}>
                    {liveNodes.node002?.gas ?? "--"}
                  </strong>{" "}
                  | Motion:{" "}
                  <strong style={{ color: "#fff" }}>
                    {liveNodes.node002?.accelX ?? "--"}
                  </strong>
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#8ba7b5",
                }}
              >
                <span>🟠 Node 003</span>
                <span>
                  People Inside:{" "}
                  <strong style={{ color: "#33d19b" }}>
                    {liveNodes.node003?.peopleInside ?? "0"}
                  </strong>
                </span>
              </div>
            </div>

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
