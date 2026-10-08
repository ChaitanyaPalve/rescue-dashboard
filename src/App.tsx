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
    addLog(
      "🔄 System Reset: All triggers cleared. All areas returned to UNCHANGED (Safe) status.",
      "info",
    )
  }

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
