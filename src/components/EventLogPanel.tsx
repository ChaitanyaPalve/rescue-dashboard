import React from "react"
import { LogEntry } from "../types"

interface EventLogPanelProps {
  logs: LogEntry[]
  onClearLogs: () => void
}

export default function EventLogPanel({
  logs,
  onClearLogs,
}: EventLogPanelProps) {
  return (
    <div
      className="flex-1 rounded p-3 flex flex-col min-h-0"
      style={{
        background: "#060b14",
        border: "1px solid rgba(0,200,180,0.15)",
      }}
    >
      <div className="flex items-center justify-between border-b border-[rgba(0,200,180,0.1)] pb-1.5 mb-2 shrink-0">
        <span
          className="text-xs font-bold tracking-widest uppercase text-[#00ffcc]"
          style={{ fontFamily: "Barlow Condensed, sans-serif" }}
        >
          Telemetry & Event Audit Log
        </span>
        <button
          onClick={onClearLogs}
          className="text-[9px] font-mono text-[#507090] hover:text-[#00ffcc] transition-colors"
        >
          Clear
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto space-y-1.5 pr-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {logs.length === 0 ? (
          <div className="text-center text-[10px] text-[#406080] py-4 font-mono">
            Log empty • System idle
          </div>
        ) : (
          logs.map((log) => {
            const colorClass =
              log.kind === "error"
                ? "text-[#ff5252]"
                : log.kind === "warn"
                  ? "text-[#ff9900]"
                  : log.kind === "success"
                    ? "text-[#00e5a3]"
                    : "text-[#6080a0]"

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 p-1 rounded bg-[#040810] border border-[rgba(255,255,255,0.03)] text-[10px]"
              >
                <span className="text-[9px] font-mono text-[#305070] shrink-0 pt-0.5">
                  {log.time}
                </span>
                <span className={`font-mono leading-tight ${colorClass}`}>
                  {log.message}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
