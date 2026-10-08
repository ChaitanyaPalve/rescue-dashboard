import React from "react"
import { AreaId, AreaInfo, TriggerType } from "../types"

interface TriggerControlsProps {
  areas: Record<AreaId, AreaInfo>
  onTriggerSpecificArea: (areaId: AreaId) => void
  onTriggerBothExits: () => void
  onResetAll: () => void
  selectedTriggerType: TriggerType
  onChangeTriggerType: (type: TriggerType) => void
  isAutoplayRunning: boolean
  autoplayStep: number
  onToggleAutoplay: () => void
  isSoundEnabled: boolean
  onToggleSound: () => void
  isolationMode: "single" | "multi"
  onToggleIsolationMode: () => void
}

export default function TriggerControls({
  areas,
  onTriggerSpecificArea,
  onTriggerBothExits,
  onResetAll,
  selectedTriggerType,
  onChangeTriggerType,
  isAutoplayRunning,
  autoplayStep,
  onToggleAutoplay,
  isSoundEnabled,
  onToggleSound,
  isolationMode,
  onToggleIsolationMode,
}: TriggerControlsProps) {
  const isClassATriggered = areas.classA.isTriggered
  const isClassBTriggered = areas.classB.isTriggered
  const isExitATriggered = areas.exitA.isTriggered
  const isExitBTriggered = areas.exitB.isTriggered
  const areBothExitsTriggered = isExitATriggered && isExitBTriggered

  const triggerTypes: { id: TriggerType; label: string; icon: string }[] = [
    { id: "fire", label: "Smoke / Fire Alarm", icon: "🔥" },
    { id: "sos", label: "Emergency SOS Pull", icon: "🆘" },
    { id: "co2", label: "CO₂ Air Hazard Spike", icon: "💨" },
    { id: "motion", label: "Intrusion / Motion", icon: "🚨" },
    { id: "manual", label: "Manual Safety Drill", icon: "⚡" },
  ]

  return (
    <div
      className="rounded p-3 flex flex-col gap-3"
      style={{
        background: "#060b14",
        border: "1px solid rgba(0,200,180,0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(0,200,180,0.1)] pb-2">
        <div>
          <span
            className="text-xs font-bold tracking-widest uppercase text-[#00ffcc]"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Trigger Control Matrix
          </span>
          <div className="text-[9px] text-[#507090] font-mono">
            Directly test individual area RED highlight
          </div>
        </div>

        {/* Sound & Mode Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSound}
            title={isSoundEnabled ? "Mute sound" : "Enable audio alarm"}
            className="p-1 rounded text-xs border border-[rgba(0,200,180,0.2)] hover:border-[rgba(0,200,180,0.5)] transition-colors text-[#a0c0e0]"
          >
            {isSoundEnabled ? "🔊" : "🔇"}
          </button>
          <button
            onClick={onToggleIsolationMode}
            title={`Current mode: ${
              isolationMode === "single"
                ? "Single Area Exclusive"
                : "Multi-Area Toggle"
            }`}
            className="px-2 py-0.5 rounded text-[9px] font-mono border border-[rgba(0,200,180,0.2)] text-[#00ffcc] hover:bg-[rgba(0,200,180,0.08)] transition-colors"
          >
            {isolationMode === "single" ? "MODE: SINGLE" : "MODE: MULTI"}
          </button>
        </div>
      </div>

      {/* Trigger Simulation Scenario Selector */}
      <div className="flex flex-col gap-1">
        <label className="text-[9px] uppercase tracking-wider text-[#6080a0] font-mono">
          Select Trigger Event Type:
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {triggerTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => onChangeTriggerType(t.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-left border text-[10px] font-medium transition-all ${
                selectedTriggerType === t.id
                  ? "bg-[rgba(0,200,180,0.12)] border-[#00ffcc] text-[#00ffcc]"
                  : "bg-[#040810] border-[rgba(0,200,180,0.1)] text-[#7090a8] hover:border-[rgba(0,200,180,0.3)]"
              }`}
            >
              <span>{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Action Buttons for Specific Area Highlights */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-[9px] uppercase tracking-wider text-[#6080a0] font-mono">
          Activate Trigger (Target Area):
        </label>

        {/* Trigger Class A Button */}
        <button
          onClick={() => onTriggerSpecificArea("classA")}
          className={`flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
            isClassATriggered
              ? "bg-[rgba(255,23,68,0.2)] border-[#ff1744] text-[#ff3366] shadow-[0_0_12px_rgba(255,23,68,0.3)]"
              : "bg-[#040912] border-[rgba(0,200,180,0.2)] text-[#a0c0d8] hover:border-[#ff1744] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🚨</span>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Trigger Class A
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgba(0,0,0,0.4)] text-[#7090b0]">
            Node 1 {isClassATriggered ? "• RED" : ""}
          </span>
        </button>

        {/* Trigger Class B Button */}
        <button
          onClick={() => onTriggerSpecificArea("classB")}
          className={`flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
            isClassBTriggered
              ? "bg-[rgba(255,23,68,0.2)] border-[#ff1744] text-[#ff3366] shadow-[0_0_12px_rgba(255,23,68,0.3)]"
              : "bg-[#040912] border-[rgba(0,200,180,0.2)] text-[#a0c0d8] hover:border-[#ff1744] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🚨</span>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Trigger Class B
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgba(0,0,0,0.4)] text-[#7090b0]">
            Node 2 {isClassBTriggered ? "• RED" : ""}
          </span>
        </button>

        {/* Trigger Exit A Button */}
        <button
          onClick={() => onTriggerSpecificArea("exitA")}
          className={`flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
            isExitATriggered && !isExitBTriggered
              ? "bg-[rgba(255,23,68,0.2)] border-[#ff1744] text-[#ff3366] shadow-[0_0_12px_rgba(255,23,68,0.3)]"
              : "bg-[#040912] border-[rgba(0,200,180,0.2)] text-[#a0c0d8] hover:border-[#ff1744] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🚪</span>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Trigger Exit A
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgba(0,0,0,0.4)] text-[#7090b0]">
            Node 3 (South) {isExitATriggered ? "• RED" : ""}
          </span>
        </button>

        {/* Trigger Exit B Button */}
        <button
          onClick={() => onTriggerSpecificArea("exitB")}
          className={`flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
            isExitBTriggered && !isExitATriggered
              ? "bg-[rgba(255,23,68,0.2)] border-[#ff1744] text-[#ff3366] shadow-[0_0_12px_rgba(255,23,68,0.3)]"
              : "bg-[#040912] border-[rgba(0,200,180,0.2)] text-[#a0c0d8] hover:border-[#ff1744] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🚪</span>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Trigger Exit B
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgba(0,0,0,0.4)] text-[#7090b0]">
            Node 3 (North) {isExitBTriggered ? "• RED" : ""}
          </span>
        </button>

        {/* Trigger Both Exits Button */}
        <button
          onClick={onTriggerBothExits}
          className={`flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
            areBothExitsTriggered
              ? "bg-[rgba(255,23,68,0.2)] border-[#ff1744] text-[#ff3366] shadow-[0_0_12px_rgba(255,23,68,0.3)]"
              : "bg-[#040912] border-[rgba(0,200,180,0.2)] text-[#a0c0d8] hover:border-[#ff1744] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Trigger Both Exits (A + B)
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[rgba(0,0,0,0.4)] text-[#7090b0]">
            Node 3 Dual Hub
          </span>
        </button>
      </div>

      {/* Autoplay Verification Demo Controller */}
      <div className="p-2.5 rounded bg-[#040810] border border-[rgba(0,200,180,0.15)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-[#00ffcc]">
            Sequential Flow Walkthrough
          </span>
          <span className="text-[9px] font-mono text-[#7090a8]">
            {isAutoplayRunning ? `Step ${autoplayStep}/5` : "Ready"}
          </span>
        </div>

        <button
          onClick={onToggleAutoplay}
          className={`w-full py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            isAutoplayRunning
              ? "bg-[#ff1744] text-white shadow-[0_0_12px_rgba(255,23,68,0.5)]"
              : "bg-[rgba(0,200,180,0.15)] text-[#00ffcc] border border-[rgba(0,200,180,0.3)] hover:bg-[rgba(0,200,180,0.25)]"
          }`}
          style={{ fontFamily: "Barlow Condensed, sans-serif" }}
        >
          {isAutoplayRunning ? "⏹ Stop Walkthrough" : "▶ Play Automated Demo"}
        </button>

        {isAutoplayRunning && (
          <div className="w-full bg-[#0a1824] h-1 rounded overflow-hidden">
            <div
              className="bg-[#00ffcc] h-full transition-all duration-300"
              style={{ width: `${(autoplayStep / 5) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Reset System to Normal */}
      <button
        onClick={onResetAll}
        className="w-full py-2 rounded text-xs font-semibold tracking-widest uppercase transition-all duration-150 hover:bg-[rgba(0,200,180,0.15)]"
        style={{
          background: "rgba(0,200,180,0.06)",
          color: "#00ffcc",
          border: "1px solid rgba(0,200,180,0.3)",
          fontFamily: "Barlow Condensed, sans-serif",
        }}
      >
        🔄 Reset System (All Safe / Normal)
      </button>
    </div>
  )
}
