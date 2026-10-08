import React from "react"
import { AreaId, AreaInfo, NodeInfo, ViewMode } from "../types"

interface SystemHeaderProps {
  areas: Record<AreaId, AreaInfo>
  nodes: NodeInfo[]
  viewMode: ViewMode
  onChangeViewMode: (mode: ViewMode) => void
}

export default function SystemHeader({
  areas,
  nodes,
  viewMode,
  onChangeViewMode,
}: SystemHeaderProps) {
  const isClassATriggered = areas.classA.isTriggered
  const isClassBTriggered = areas.classB.isTriggered
  const isExitATriggered = areas.exitA.isTriggered
  const isExitBTriggered = areas.exitB.isTriggered

  const triggeredAreas = [
    isClassATriggered ? { name: "Class A", node: "Node 1" } : null,
    isClassBTriggered ? { name: "Class B", node: "Node 2" } : null,
    isExitATriggered ? { name: "Exit A", node: "Node 3" } : null,
    isExitBTriggered ? { name: "Exit B", node: "Node 3" } : null,
  ].filter(Boolean) as { name: string; node: string }[]

  const anyTriggered = triggeredAreas.length > 0
  const nodesCount = nodes.length
  const onlineNodes = nodes.filter((n) => n.status !== "offline").length
  const unchangedCount = 4 - triggeredAreas.length

  return (
    <header className="flex flex-col shrink-0 border-b border-[rgba(0,200,180,0.12)] bg-[#040810]">
      {/* ── Top Bar with Branding & View Switcher ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(0,200,180,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-[rgba(0,230,180,0.1)] border border-[rgba(0,230,180,0.3)]">
            <span className="text-base leading-none">🏢</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-base font-bold tracking-wider text-white uppercase"
                style={{ fontFamily: "Barlow Condensed, sans-serif" }}
              >
                Node-Based Classroom Telemetry
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[rgba(0,230,180,0.1)] text-[#00ffcc] border border-[rgba(0,230,180,0.2)]">
                v2.4
              </span>
            </div>
            <div className="text-[10px] text-[#6080a0] font-mono">
              Class A (Node 1) • Class B (Node 2) • Exit A & Exit B (Node 3)
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#06101a] p-1 rounded border border-[rgba(0,200,180,0.15)]">
          <button
            onClick={() => onChangeViewMode("isometric")}
            className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
              viewMode === "isometric"
                ? "bg-[rgba(0,200,180,0.2)] text-[#00ffcc] border border-[rgba(0,200,180,0.4)] shadow-[0_0_10px_rgba(0,200,180,0.2)]"
                : "text-[#7090a8] hover:text-[#c0d8f0]"
            }`}
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            🌐 3D Isometric Map
          </button>
          <button
            onClick={() => onChangeViewMode("flow")}
            className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
              viewMode === "flow"
                ? "bg-[rgba(0,200,180,0.2)] text-[#00ffcc] border border-[rgba(0,200,180,0.4)] shadow-[0_0_10px_rgba(0,200,180,0.2)]"
                : "text-[#7090a8] hover:text-[#c0d8f0]"
            }`}
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            🔀 Flow Architecture
          </button>
          <button
            onClick={() => onChangeViewMode("split")}
            className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
              viewMode === "split"
                ? "bg-[rgba(0,200,180,0.2)] text-[#00ffcc] border border-[rgba(0,200,180,0.4)] shadow-[0_0_10px_rgba(0,200,180,0.2)]"
                : "text-[#7090a8] hover:text-[#c0d8f0]"
            }`}
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            ⚡ Split Dual View
          </button>
        </div>
      </div>

      {/* ── High-Visibility Dynamic Trigger Banner ── */}
      <div
        className={`px-4 py-1.5 flex items-center justify-between text-xs font-mono transition-all duration-300 ${
          anyTriggered
            ? "bg-[rgba(255,23,68,0.18)] border-b border-[#ff1744] text-white shadow-[0_4px_20px_rgba(255,23,68,0.25)]"
            : "bg-[#050c14] border-b border-[rgba(0,200,180,0.08)] text-[#60e0b0]"
        }`}
      >
        <div className="flex items-center gap-2">
          {anyTriggered ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff1744] animate-ping" />
              <span className="font-bold text-[#ff3366] uppercase tracking-wider">
                🚨 TRIGGER ACTIVATED:
              </span>
              <span className="text-white font-bold bg-[#38060e] px-2 py-0.5 rounded border border-[#ff1744]">
                {triggeredAreas
                  .map((t) => `${t.name} (via ${t.node})`)
                  .join(" + ")}
              </span>
              <span className="text-[#ff99aa]">
                ➜ Specific Area Highlighted in{" "}
                <strong className="text-[#ff1744] underline">RED</strong>
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#00ffcc] shadow-[0_0_8px_#00ffcc]" />
              <span className="text-[#00ffcc] font-semibold">
                SYSTEM NOMINAL • ALL 3 NODES ACTIVE • ALL AREAS CLEAR
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          {anyTriggered ? (
            <span className="text-[#5ce0c5] bg-[#071822] px-2 py-0.5 rounded border border-[rgba(0,200,180,0.2)]">
              ✔ {unchangedCount} Area{unchangedCount !== 1 ? "s" : ""} Unchanged
              (Safe)
            </span>
          ) : (
            <span className="text-[#7090a8]">Ready for Trigger Detection</span>
          )}
        </div>
      </div>

      {/* ── Stat Metric Cards ── */}
      <div className="flex gap-2 px-3 py-1.5 bg-[#050a12]">
        {/* Stat 1 */}
        <div className="flex-1 px-3 py-1.5 rounded bg-[#06121c] border border-[rgba(0,200,180,0.12)]">
          <div className="text-[9px] uppercase tracking-wider text-[#6080a0] font-mono">
            Active Nodes
          </div>
          <div
            className="text-lg font-bold text-[#00ffcc] leading-tight"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            {onlineNodes}/{nodesCount}
          </div>
          <div className="text-[8px] text-[#406080] font-mono">
            Node 1, 2, 3 Online
          </div>
        </div>

        {/* Stat 2 */}
        <div
          className={`flex-1 px-3 py-1.5 rounded border transition-colors ${
            anyTriggered
              ? "bg-[rgba(255,23,68,0.1)] border-[#ff1744]"
              : "bg-[#06121c] border-[rgba(0,200,180,0.12)]"
          }`}
        >
          <div className="text-[9px] uppercase tracking-wider text-[#6080a0] font-mono">
            Trigger Status
          </div>
          <div
            className={`text-lg font-bold leading-tight ${
              anyTriggered ? "text-[#ff1744]" : "text-[#00ffcc]"
            }`}
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            {anyTriggered ? `${triggeredAreas.length} RED ALERT` : "0 Normal"}
          </div>
          <div className="text-[8px] text-[#507090] font-mono">
            {anyTriggered ? "Isolated Target" : "Zero Threats"}
          </div>
        </div>

        {/* Stat 3 */}
        <div className="flex-1 px-3 py-1.5 rounded bg-[#06121c] border border-[rgba(0,200,180,0.12)]">
          <div className="text-[9px] uppercase tracking-wider text-[#6080a0] font-mono">
            Isolation State
          </div>
          <div
            className="text-lg font-bold text-[#5ce0c5] leading-tight"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            {unchangedCount} Unchanged
          </div>
          <div className="text-[8px] text-[#406080] font-mono">
            Remaining Areas Safe
          </div>
        </div>

        {/* Stat 4 */}
        <div className="flex-1 px-3 py-1.5 rounded bg-[#06121c] border border-[rgba(0,200,180,0.12)]">
          <div className="text-[9px] uppercase tracking-wider text-[#6080a0] font-mono">
            Exit Gateway Telemetry
          </div>
          <div
            className={`text-lg font-bold leading-tight ${
              isExitATriggered && isExitBTriggered
                ? "text-[#ff1744]"
                : isExitATriggered || isExitBTriggered
                  ? "text-[#ff9900]"
                  : "text-[#00ffcc]"
            }`}
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            {isExitATriggered && isExitBTriggered
              ? "Blocked (Both)"
              : isExitATriggered
                ? "Exit B Active"
                : isExitBTriggered
                  ? "Exit A Active"
                  : "Dual Exits Clear"}
          </div>
          <div className="text-[8px] text-[#406080] font-mono">
            Managed via Node 3
          </div>
        </div>
      </div>
    </header>
  )
}
