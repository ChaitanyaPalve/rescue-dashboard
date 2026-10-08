import React from "react"
import { AreaId, AreaInfo, NodeInfo } from "../types"

interface NodeFlowDiagramProps {
  areas: Record<AreaId, AreaInfo>
  nodes: NodeInfo[]
  onToggleAreaTrigger: (id: AreaId) => void
}

export default function NodeFlowDiagram({
  areas,
  nodes,
  onToggleAreaTrigger,
}: NodeFlowDiagramProps) {
  const isClassATriggered = areas.classA.isTriggered
  const isClassBTriggered = areas.classB.isTriggered
  const isExitATriggered = areas.exitA.isTriggered
  const isExitBTriggered = areas.exitB.isTriggered

  const node1 = nodes.find((n) => n.id === "node1")
  const node2 = nodes.find((n) => n.id === "node2")
  const node3 = nodes.find((n) => n.id === "node3")

  // Any trigger active?
  const anyTriggered =
    isClassATriggered ||
    isClassBTriggered ||
    isExitATriggered ||
    isExitBTriggered

  const triggeredAreasList = [
    isClassATriggered ? "Class A" : null,
    isClassBTriggered ? "Class B" : null,
    isExitATriggered ? "Exit A" : null,
    isExitBTriggered ? "Exit B" : null,
  ].filter(Boolean) as string[]

  return (
    <div className="w-full h-full flex flex-col p-4 bg-[#040810] rounded border border-[rgba(0,200,180,0.15)] overflow-y-auto">
      {/* Title & Architectural Statement */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(0,200,180,0.15)] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ffcc] shadow-[0_0_8px_#00ffcc]" />
            <h2
              className="text-sm font-bold tracking-widest uppercase text-[#00ffcc]"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Node-Based Classroom Flow Architecture
            </h2>
          </div>
          <p
            className="text-[11px] text-[#507090] mt-0.5"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            Class A → Node 1 &nbsp;|&nbsp; Class B → Node 2 &nbsp;|&nbsp; Exit A
            + Exit B → Node 3 &nbsp;|&nbsp; Specific Affected Area Highlighted
            in RED
          </p>
        </div>

        {/* Global Trigger Flow Status Pill */}
        <div
          className={`px-3 py-1.5 rounded border text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
            anyTriggered
              ? "bg-[rgba(255,23,68,0.15)] border-[#ff1744] text-[#ff3366] shadow-[0_0_15px_rgba(255,23,68,0.3)]"
              : "bg-[rgba(0,230,180,0.08)] border-[rgba(0,230,180,0.3)] text-[#00ffcc]"
          }`}
          style={{ fontFamily: "Barlow Condensed, sans-serif" }}
        >
          {anyTriggered ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff1744] animate-ping" />
              TRIGGER ACTIVATED: {triggeredAreasList.join(", ")} (RED HIGHLIGHT)
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00ffcc]" />
              FLOW NOMINAL • ALL NODES SECURE
            </span>
          )}
        </div>
      </div>

      {/* ── FLOW DIAGRAM CANVAS ── */}
      <div className="flex-1 flex flex-col justify-center py-4">
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* ════ STAGE 1: PHYSICAL SPACES / AREAS (Cols 1-3) ════ */}
          <div className="col-span-3 flex flex-col gap-3">
            <div
              className="text-[10px] uppercase font-bold text-[#406080] tracking-widest text-center"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Stage 1: Campus Areas
            </div>

            {/* CLASS A CARD */}
            <div
              onClick={() => onToggleAreaTrigger("classA")}
              className={`p-3 rounded border cursor-pointer transition-all duration-300 ${
                isClassATriggered
                  ? "bg-[rgba(255,23,68,0.18)] border-[#ff1744] shadow-[0_0_20px_rgba(255,23,68,0.4)] ring-1 ring-[#ff1744]"
                  : "bg-[#06121a] border-[rgba(0,200,180,0.2)] hover:border-[rgba(0,200,180,0.6)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${
                    isClassATriggered ? "text-[#ff1744]" : "text-[#00ffcc]"
                  }`}
                  style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                >
                  CLASS A
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isClassATriggered
                      ? "bg-[#ff1744] text-white font-bold"
                      : "bg-[#0a2022] text-[#00ffcc]"
                  }`}
                >
                  {isClassATriggered ? "RED ALERT" : "SAFE"}
                </span>
              </div>
              <div className="text-[10px] text-[#7090b0] mt-1 font-mono flex items-center justify-between">
                <span>Occupants: {areas.classA.occupants}</span>
                <span
                  className={
                    isClassATriggered ? "text-[#ff3366] font-semibold" : ""
                  }
                >
                  {isClassATriggered ? "⚠️ TRIGGERED" : "Normal"}
                </span>
              </div>
            </div>

            {/* CLASS B CARD */}
            <div
              onClick={() => onToggleAreaTrigger("classB")}
              className={`p-3 rounded border cursor-pointer transition-all duration-300 ${
                isClassBTriggered
                  ? "bg-[rgba(255,23,68,0.18)] border-[#ff1744] shadow-[0_0_20px_rgba(255,23,68,0.4)] ring-1 ring-[#ff1744]"
                  : "bg-[#06121a] border-[rgba(0,200,180,0.2)] hover:border-[rgba(0,200,180,0.6)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${
                    isClassBTriggered ? "text-[#ff1744]" : "text-[#00ffcc]"
                  }`}
                  style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                >
                  CLASS B
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isClassBTriggered
                      ? "bg-[#ff1744] text-white font-bold"
                      : "bg-[#0a2022] text-[#00ffcc]"
                  }`}
                >
                  {isClassBTriggered ? "RED ALERT" : "SAFE"}
                </span>
              </div>
              <div className="text-[10px] text-[#7090b0] mt-1 font-mono flex items-center justify-between">
                <span>Occupants: {areas.classB.occupants}</span>
                <span
                  className={
                    isClassBTriggered ? "text-[#ff3366] font-semibold" : ""
                  }
                >
                  {isClassBTriggered ? "⚠️ TRIGGERED" : "Normal"}
                </span>
              </div>
            </div>

            {/* EXIT A & EXIT B CONTAINER CARD */}
            <div className="p-2.5 rounded border border-[rgba(0,200,180,0.15)] bg-[#050e16] flex flex-col gap-2">
              <div className="text-[9px] uppercase tracking-wider text-[#407090] font-mono font-bold">
                Dual Exit Gateways
              </div>

              {/* EXIT A SUB-CARD */}
              <div
                onClick={() => onToggleAreaTrigger("exitA")}
                className={`p-2 rounded border cursor-pointer transition-all duration-300 ${
                  isExitATriggered
                    ? "bg-[rgba(255,23,68,0.2)] border-[#ff1744] shadow-[0_0_15px_rgba(255,23,68,0.4)]"
                    : "bg-[#071520] border-[rgba(0,200,180,0.15)] hover:border-[rgba(0,200,180,0.5)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isExitATriggered ? "text-[#ff1744]" : "text-[#00ffcc]"
                    }`}
                    style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                  >
                    EXIT A (South)
                  </span>
                  <span
                    className={`text-[8.5px] px-1 py-0.2 rounded font-mono ${
                      isExitATriggered
                        ? "bg-[#ff1744] text-white"
                        : "bg-[#082220] text-[#00ffcc]"
                    }`}
                  >
                    {isExitATriggered ? "RED ALERT" : "CLEAR"}
                  </span>
                </div>
              </div>

              {/* EXIT B SUB-CARD */}
              <div
                onClick={() => onToggleAreaTrigger("exitB")}
                className={`p-2 rounded border cursor-pointer transition-all duration-300 ${
                  isExitBTriggered
                    ? "bg-[rgba(255,23,68,0.2)] border-[#ff1744] shadow-[0_0_15px_rgba(255,23,68,0.4)]"
                    : "bg-[#071520] border-[rgba(0,200,180,0.15)] hover:border-[rgba(0,200,180,0.5)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isExitBTriggered ? "text-[#ff1744]" : "text-[#00ffcc]"
                    }`}
                    style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                  >
                    EXIT B (North)
                  </span>
                  <span
                    className={`text-[8.5px] px-1 py-0.2 rounded font-mono ${
                      isExitBTriggered
                        ? "bg-[#ff1744] text-white"
                        : "bg-[#082220] text-[#00ffcc]"
                    }`}
                  >
                    {isExitBTriggered ? "RED ALERT" : "CLEAR"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ════ CONNECTORS 1: AREA → NODE (Cols 4) ════ */}
          <div className="col-span-1 flex flex-col justify-around h-full py-4 relative">
            {/* SVG Connecting Flow Lines */}
            <svg className="w-full h-full min-h-[220px]" viewBox="0 0 40 220">
              {/* Line 1: Class A -> Node 1 */}
              <line
                x1="0"
                y1="35"
                x2="40"
                y2="35"
                stroke={isClassATriggered ? "#ff1744" : "#00ffcc"}
                strokeWidth={isClassATriggered ? 3 : 1.5}
                strokeDasharray={isClassATriggered ? "4 3" : "6 4"}
                className={isClassATriggered ? "net-line-alert" : "net-line"}
              />
              {/* Line 2: Class B -> Node 2 */}
              <line
                x1="0"
                y1="95"
                x2="40"
                y2="95"
                stroke={isClassBTriggered ? "#ff1744" : "#00ffcc"}
                strokeWidth={isClassBTriggered ? 3 : 1.5}
                strokeDasharray={isClassBTriggered ? "4 3" : "6 4"}
                className={isClassBTriggered ? "net-line-alert" : "net-line"}
              />
              {/* Line 3: Exit A -> Node 3 */}
              <path
                d="M 0 155 C 20 155, 20 175, 40 175"
                fill="none"
                stroke={isExitATriggered ? "#ff1744" : "#00ffcc"}
                strokeWidth={isExitATriggered ? 3 : 1.5}
                strokeDasharray={isExitATriggered ? "4 3" : "6 4"}
                className={isExitATriggered ? "net-line-alert" : "net-line"}
              />
              {/* Line 4: Exit B -> Node 3 */}
              <path
                d="M 0 195 C 20 195, 20 175, 40 175"
                fill="none"
                stroke={isExitBTriggered ? "#ff1744" : "#00ffcc"}
                strokeWidth={isExitBTriggered ? 3 : 1.5}
                strokeDasharray={isExitBTriggered ? "4 3" : "6 4"}
                className={isExitBTriggered ? "net-line-alert" : "net-line"}
              />
            </svg>
          </div>

          {/* ════ STAGE 2: NODE TELEMETRY CONTROLLERS (Cols 5-7) ════ */}
          <div className="col-span-3 flex flex-col gap-3">
            <div
              className="text-[10px] uppercase font-bold text-[#406080] tracking-widest text-center"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Stage 2: Assigned Nodes
            </div>

            {/* NODE 1 CARD (Monitors Class A) */}
            <div
              className={`p-3 rounded border transition-all duration-300 ${
                isClassATriggered
                  ? "bg-[rgba(255,23,68,0.18)] border-[#ff1744] shadow-[0_0_15px_rgba(255,23,68,0.3)]"
                  : "bg-[#06121a] border-[rgba(0,200,180,0.2)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isClassATriggered
                        ? "bg-[#ff1744] animate-ping"
                        : "bg-[#00ffcc]"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      isClassATriggered ? "text-[#ff1744]" : "text-[#00ffcc]"
                    }`}
                    style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                  >
                    NODE 1
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#7090b0]">
                  Batt: {node1?.battery}%
                </span>
              </div>
              <div className="text-[10px] text-[#5080a0] font-mono mt-1">
                Monitors: <span className="text-[#a0c0e0]">Class A</span>
              </div>
              <div
                className={`text-[9.5px] mt-1 font-mono font-semibold ${
                  isClassATriggered ? "text-[#ff3366]" : "text-[#00e5a3]"
                }`}
              >
                {isClassATriggered
                  ? "⚠️ Trigger Signal Dispatched"
                  : "Telemetry: Nominal"}
              </div>
            </div>

            {/* NODE 2 CARD (Monitors Class B) */}
            <div
              className={`p-3 rounded border transition-all duration-300 ${
                isClassBTriggered
                  ? "bg-[rgba(255,23,68,0.18)] border-[#ff1744] shadow-[0_0_15px_rgba(255,23,68,0.3)]"
                  : "bg-[#06121a] border-[rgba(0,200,180,0.2)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isClassBTriggered
                        ? "bg-[#ff1744] animate-ping"
                        : "bg-[#00ffcc]"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      isClassBTriggered ? "text-[#ff1744]" : "text-[#00ffcc]"
                    }`}
                    style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                  >
                    NODE 2
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#7090b0]">
                  Batt: {node2?.battery}%
                </span>
              </div>
              <div className="text-[10px] text-[#5080a0] font-mono mt-1">
                Monitors: <span className="text-[#a0c0e0]">Class B</span>
              </div>
              <div
                className={`text-[9.5px] mt-1 font-mono font-semibold ${
                  isClassBTriggered ? "text-[#ff3366]" : "text-[#00e5a3]"
                }`}
              >
                {isClassBTriggered
                  ? "⚠️ Trigger Signal Dispatched"
                  : "Telemetry: Nominal"}
              </div>
            </div>

            {/* NODE 3 CARD (Monitors Exit A & Exit B) */}
            <div
              className={`p-3 rounded border transition-all duration-300 ${
                isExitATriggered || isExitBTriggered
                  ? "bg-[rgba(255,23,68,0.18)] border-[#ff1744] shadow-[0_0_15px_rgba(255,23,68,0.3)]"
                  : "bg-[#06121a] border-[rgba(0,200,180,0.2)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isExitATriggered || isExitBTriggered
                        ? "bg-[#ff1744] animate-ping"
                        : "bg-[#00ffcc]"
                    }`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      isExitATriggered || isExitBTriggered
                        ? "text-[#ff1744]"
                        : "text-[#00ffcc]"
                    }`}
                    style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                  >
                    NODE 3 (Dual Exit Hub)
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#7090b0]">
                  Batt: {node3?.battery}%
                </span>
              </div>
              <div className="text-[10px] text-[#5080a0] font-mono mt-1">
                Monitors:{" "}
                <span className="text-[#a0c0e0]">Exit A & Exit B</span>
              </div>
              <div
                className={`text-[9.5px] mt-1 font-mono font-semibold ${
                  isExitATriggered || isExitBTriggered
                    ? "text-[#ff3366]"
                    : "text-[#00e5a3]"
                }`}
              >
                {isExitATriggered && isExitBTriggered
                  ? "⚠️ Dual Exit Alert Signal"
                  : isExitATriggered
                    ? "⚠️ Exit A Alert Signal"
                    : isExitBTriggered
                      ? "⚠️ Exit B Alert Signal"
                      : "Dual Exit Links: Clear"}
              </div>
            </div>
          </div>

          {/* ════ CONNECTORS 2: NODES → CENTRAL ENGINE (Col 8) ════ */}
          <div className="col-span-1 flex flex-col justify-center h-full relative">
            <svg className="w-full h-full min-h-[220px]" viewBox="0 0 40 220">
              {/* Node 1 to Center */}
              <path
                d="M 0 35 C 20 35, 20 110, 40 110"
                fill="none"
                stroke={isClassATriggered ? "#ff1744" : "#00ffcc"}
                strokeWidth={isClassATriggered ? 2.5 : 1.2}
                strokeDasharray="4 3"
                className={isClassATriggered ? "net-line-alert" : "net-line"}
              />
              {/* Node 2 to Center */}
              <line
                x1="0"
                y1="95"
                x2="40"
                y2="110"
                stroke={isClassBTriggered ? "#ff1744" : "#00ffcc"}
                strokeWidth={isClassBTriggered ? 2.5 : 1.2}
                strokeDasharray="4 3"
                className={isClassBTriggered ? "net-line-alert" : "net-line"}
              />
              {/* Node 3 to Center */}
              <path
                d="M 0 175 C 20 175, 20 110, 40 110"
                fill="none"
                stroke={
                  isExitATriggered || isExitBTriggered ? "#ff1744" : "#00ffcc"
                }
                strokeWidth={isExitATriggered || isExitBTriggered ? 2.5 : 1.2}
                strokeDasharray="4 3"
                className={
                  isExitATriggered || isExitBTriggered
                    ? "net-line-alert"
                    : "net-line"
                }
              />
            </svg>
          </div>

          {/* ════ STAGE 3: TRIGGER ACTIVATION & RED HIGHLIGHT (Cols 9-12) ════ */}
          <div className="col-span-4 flex flex-col gap-3">
            <div
              className="text-[10px] uppercase font-bold text-[#406080] tracking-widest text-center"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              Stage 3: Trigger Condition & Highlight Engine
            </div>

            <div
              className={`p-4 rounded border flex flex-col gap-2.5 transition-all duration-300 ${
                anyTriggered
                  ? "bg-[rgba(255,23,68,0.12)] border-[#ff1744] shadow-[0_0_25px_rgba(255,23,68,0.25)] ring-1 ring-[#ff1744]"
                  : "bg-[#06121a] border-[rgba(0,200,180,0.25)]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider text-[#a0c0e0]"
                  style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                >
                  System Identification Rule
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                    anyTriggered
                      ? "bg-[#ff1744] text-white"
                      : "bg-[#0a2520] text-[#00ffcc]"
                  }`}
                >
                  {anyTriggered ? "ACTIVE ALERT" : "STANDBY"}
                </span>
              </div>

              {/* Exact Prompt Execution Box */}
              <div className="flex flex-col gap-1.5 text-xs font-mono">
                {anyTriggered ? (
                  <>
                    <div className="text-[#ff5252] font-semibold flex items-center gap-1.5">
                      <span>🚨</span>
                      <span>Trigger Detected:</span>
                    </div>
                    <div className="p-2 rounded bg-[#2b0509] border border-[#ff1744] text-white">
                      <div className="font-bold text-[#ff3366] text-xs">
                        Affected Area Identified:
                      </div>
                      <div className="text-sm font-bold tracking-wide mt-0.5">
                        {triggeredAreasList.join(" & ")}
                      </div>
                      <div className="text-[10px] text-[#ffb0c0] mt-1">
                        ➜ Highlighted in{" "}
                        <span className="font-bold text-[#ff1744] underline">
                          RED
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#06141e] border border-[rgba(0,200,180,0.2)] text-[11px] text-[#60e0b0]">
                      <div className="font-semibold text-[#00ffcc]">
                        Non-Affected Areas:
                      </div>
                      <div>
                        All other campus areas remain completely{" "}
                        <span className="font-bold uppercase text-[#00ffcc]">
                          UNCHANGED
                        </span>
                        .
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-[#507090]">
                    <div className="text-sm mb-1 text-[#6080a0]">
                      No Trigger Active
                    </div>
                    <div className="text-[10px]">
                      Activate a trigger on Class A, Class B, or Exits to test
                      immediate RED highlighting.
                    </div>
                  </div>
                )}
              </div>

              {/* Architectural Isolation Guarantee */}
              <div className="text-[9px] text-[#507090] font-mono pt-1 border-t border-[rgba(255,255,255,0.06)]">
                Rule: "The red highlight appears only on the specific class/area
                where the trigger is detected, while all other areas remain
                unchanged."
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
