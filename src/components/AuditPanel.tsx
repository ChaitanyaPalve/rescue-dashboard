import React from "react"
import { AreaId, AreaInfo, NodeInfo } from "../types"

interface AuditPanelProps {
  areas: Record<AreaId, AreaInfo>
  nodes: NodeInfo[]
  onSelectArea: (id: AreaId) => void
}

export default function AuditPanel({
  areas,
  nodes,
  onSelectArea,
}: AuditPanelProps) {
  const areaList = [
    {
      key: "classA" as AreaId,
      name: "Class A",
      node: "Node 1",
      role: "West Wing Classroom",
    },
    {
      key: "classB" as AreaId,
      name: "Class B",
      node: "Node 2",
      role: "East Wing Classroom",
    },
    {
      key: "exitA" as AreaId,
      name: "Exit A",
      node: "Node 3",
      role: "South Evacuation Portal",
    },
    {
      key: "exitB" as AreaId,
      name: "Exit B",
      node: "Node 3",
      role: "North Evacuation Portal",
    },
  ]

  return (
    <div
      className="rounded p-3 flex flex-col gap-2.5"
      style={{
        background: "#060b14",
        border: "1px solid rgba(0,200,180,0.15)",
      }}
    >
      <div className="flex items-center justify-between border-b border-[rgba(0,200,180,0.1)] pb-1.5">
        <span
          className="text-xs font-bold tracking-widest uppercase text-[#00ffcc]"
          style={{ fontFamily: "Barlow Condensed, sans-serif" }}
        >
          Area Isolation & Telemetry Audit
        </span>
        <span className="text-[9px] font-mono text-[#507090]">
          4 Monitored Zones
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {areaList.map((item) => {
          const area = areas[item.key]
          const node = nodes.find((n) => n.id === area.nodeId)
          const isTriggered = area.isTriggered

          return (
            <div
              key={item.key}
              onClick={() => onSelectArea(item.key)}
              className={`p-2 rounded border transition-all cursor-pointer ${
                isTriggered
                  ? "bg-[rgba(255,23,68,0.12)] border-[#ff1744] shadow-[0_0_10px_rgba(255,23,68,0.2)]"
                  : "bg-[#040810] border-[rgba(0,200,180,0.1)] hover:border-[rgba(0,200,180,0.3)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isTriggered
                        ? "bg-[#ff1744] animate-ping"
                        : "bg-[#00ffcc] shadow-[0_0_5px_#00ffcc]"
                    }`}
                  />
                  <div>
                    <span
                      className={`text-xs font-bold ${
                        isTriggered ? "text-[#ff1744]" : "text-white"
                      }`}
                      style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                    >
                      {item.name}
                    </span>
                    <span className="text-[9px] text-[#6080a0] font-mono ml-2">
                      ({item.node})
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                    isTriggered
                      ? "bg-[#ff1744] text-white shadow-[0_0_8px_rgba(255,23,68,0.4)]"
                      : "bg-[#06201a] text-[#00ffcc] border border-[rgba(0,200,180,0.2)]"
                  }`}
                >
                  {isTriggered ? "🔴 RED HIGHLIGHT" : "🟢 UNCHANGED"}
                </span>
              </div>

              {/* Telemetry Details */}
              <div className="grid grid-cols-3 gap-1 mt-1.5 pt-1.5 border-t border-[rgba(255,255,255,0.05)] text-[9px] font-mono text-[#7090a8]">
                <div>
                  Occupants:{" "}
                  <span className="text-white">{area.occupants}</span>
                </div>
                <div>
                  Temp:{" "}
                  <span
                    className={isTriggered ? "text-[#ff5252]" : "text-white"}
                  >
                    {area.temperature}°C
                  </span>
                </div>
                <div>
                  CO₂:{" "}
                  <span
                    className={isTriggered ? "text-[#ff5252]" : "text-white"}
                  >
                    {area.co2Level} ppm
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
