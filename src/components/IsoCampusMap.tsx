import React, { useState } from "react"
import { AreaId, AreaInfo, NodeInfo } from "../types"

interface IsoCampusMapProps {
  areas: Record<AreaId, AreaInfo>
  nodes: NodeInfo[]
  onToggleAreaTrigger: (id: AreaId) => void
  selectedAreaId: AreaId | null
  onSelectArea: (id: AreaId | null) => void
}

// ── Isometric Projection Constants ──────────────────────────────────────────
const HTW = 48 // Half-tile width
const HTH = 24 // Half-tile height
const WH = 34 // Wall height
const CX = 370 // SVG Center X
const CY = 75 // SVG Origin Y (North apex)

type Pt = { x: number; y: number }

const iso = (wx: number, wy: number, wz = 0): Pt => ({
  x: CX + (wx - wy) * HTW,
  y: CY + (wx + wy) * HTH - wz * WH,
})

const pts = (ps: Pt[]) =>
  ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")

const flr = (x1: number, y1: number, x2: number, y2: number, z = 0) =>
  pts([iso(x1, y1, z), iso(x2, y1, z), iso(x2, y2, z), iso(x1, y2, z)])

const sw = (x1: number, x2: number, y: number, z0 = 0, z1 = 1) =>
  pts([iso(x1, y, z0), iso(x2, y, z0), iso(x2, y, z1), iso(x1, y, z1)])

const ew = (x: number, y1: number, y2: number, z0 = 0, z1 = 1) =>
  pts([iso(x, y1, z0), iso(x, y2, z0), iso(x, y2, z1), iso(x, y1, z1)])

export default function IsoCampusMap({
  areas,
  nodes,
  onToggleAreaTrigger,
  selectedAreaId,
  onSelectArea,
}: IsoCampusMapProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)

  const isClassATriggered = areas.classA.isTriggered
  const isClassBTriggered = areas.classB.isTriggered
  const isExitATriggered = areas.exitA.isTriggered
  const isExitBTriggered = areas.exitB.isTriggered

  // Color Palettes
  // NORMAL (Safe / Cyan-Teal)
  const SAFE = {
    fl: "#071815",
    sw: "#0b2620",
    ew: "#09211c",
    glow: "#00ffcc",
    border: "#00e5a3",
    ridge: "#00ffc4",
    text: "#00ffcc",
  }

  // RED TRIGGERED ALERT
  const DANGER = {
    fl: "#2b0509",
    sw: "#440a12",
    ew: "#36070e",
    glow: "#ff1744",
    border: "#ff3366",
    ridge: "#ff1744",
    text: "#ff3366",
  }

  // Auxiliary / Corridor Neutral
  const CORR = "#050a10"
  const CORR_C = "#070e17"
  const AUX_FL = "#050d14"
  const AUX_SW = "#0a1722"
  const AUX_EW = "#08131d"

  const colA = isClassATriggered ? DANGER : SAFE
  const colB = isClassBTriggered ? DANGER : SAFE
  const colExitA = isExitATriggered ? DANGER : SAFE
  const colExitB = isExitBTriggered ? DANGER : SAFE

  const node1 = nodes.find((n) => n.id === "node1")
  const node2 = nodes.find((n) => n.id === "node2")
  const node3 = nodes.find((n) => n.id === "node3")

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden">
      <svg
        viewBox="0 0 740 450"
        className="w-full h-full"
        style={{ maxHeight: "100%", maxWidth: "100%" }}
      >
        <defs>
          {/* Cyan Glow Filter */}
          <filter id="tg" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense Red Alert Glow Filter */}
          <filter id="red-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur1"
            />
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="4"
              result="blur2"
            />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Network Link Glow */}
          <filter id="net-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Isometric Tile Grid Pattern */}
          <pattern
            id="iso-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(26.57 0 0)"
          >
            <circle cx="12" cy="12" r="0.8" fill="rgba(0, 230, 180, 0.12)" />
          </pattern>

          {/* Red Alert Grid Pattern */}
          <pattern
            id="red-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(26.57 0 0)"
          >
            <circle cx="12" cy="12" r="1.1" fill="rgba(255, 30, 60, 0.4)" />
          </pattern>

          {/* Hazard Stripe Pattern for Triggered Exits */}
          <pattern
            id="hazard-stripes"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="10" height="20" fill="rgba(255, 23, 68, 0.35)" />
            <rect x="10" width="10" height="20" fill="rgba(40, 5, 10, 0.9)" />
          </pattern>

          {/* Safe Exit Stripe Pattern */}
          <pattern
            id="safe-stripes"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="10" height="20" fill="rgba(0, 230, 180, 0.15)" />
            <rect x="10" width="10" height="20" fill="rgba(5, 20, 18, 0.85)" />
          </pattern>
        </defs>

        {/* ── GROUND SHADOW & BASE ── */}
        <polygon
          points={flr(0, 0, 6, 6, -0.05)}
          fill="#020408"
          stroke="rgba(0, 200, 180, 0.08)"
          strokeWidth="1.5"
        />

        {/* ── 1. CORRIDOR FLOORS ── */}
        {/* North-South corridor (Exit B to Exit A through Node 3 central crossroads) */}
        <polygon points={flr(2, 0, 4, 2)} fill={CORR} />
        <polygon points={flr(0, 2, 2, 4)} fill={CORR} />
        <polygon points={flr(2, 2, 4, 4)} fill={CORR_C} />
        <polygon points={flr(4, 2, 6, 4)} fill={CORR} />
        <polygon points={flr(2, 4, 4, 6)} fill={CORR} />

        {/* Corridor grid overlay */}
        <polygon points={flr(2, 0, 4, 6)} fill="url(#iso-grid)" opacity="0.8" />
        <polygon points={flr(0, 2, 6, 4)} fill="url(#iso-grid)" opacity="0.8" />

        {/* ── 2. AUXILIARY / BACKGROUND WINGS ── */}
        {/* Northeast wing (wx 4..6, wy 0..2) */}
        <g opacity="0.85">
          <polygon points={flr(4, 0, 6, 2)} fill={AUX_FL} />
          <polygon
            points={flr(4, 0, 6, 2)}
            fill="url(#iso-grid)"
            opacity="0.3"
          />
          <polygon points={sw(4, 6, 2)} fill={AUX_SW} />
          <polygon points={ew(6, 0, 2)} fill={AUX_EW} />
          {/* Label */}
          <text
            x={iso(5, 1).x}
            y={iso(5, 1).y + 3}
            textAnchor="middle"
            fill="#406080"
            fontSize="7.5"
            fontFamily="Barlow Condensed, sans-serif"
            letterSpacing="1"
          >
            SCIENCE LAB / ANCILLARY WING
          </text>
        </g>

        {/* Southwest wing (wx 0..2, wy 4..6) */}
        <g opacity="0.85">
          <polygon points={flr(0, 4, 2, 6)} fill={AUX_FL} />
          <polygon
            points={flr(0, 4, 2, 6)}
            fill="url(#iso-grid)"
            opacity="0.3"
          />
          <polygon points={sw(0, 2, 6)} fill={AUX_SW} />
          <polygon points={ew(2, 4, 6)} fill={AUX_EW} />
          {/* Label */}
          <text
            x={iso(1, 5).x}
            y={iso(1, 5).y + 3}
            textAnchor="middle"
            fill="#406080"
            fontSize="7.5"
            fontFamily="Barlow Condensed, sans-serif"
            letterSpacing="1"
          >
            CAMPUS COMMONS / ATRIUM
          </text>
        </g>

        {/* ── 3. CLASS A (Monitored by Node 1) ── */}
        <g
          className="cursor-pointer transition-all duration-300"
          onClick={() => onToggleAreaTrigger("classA")}
          onMouseEnter={() => setHoveredZone("classA")}
          onMouseLeave={() => setHoveredZone(null)}
        >
          {/* Room Floor */}
          <polygon
            points={flr(0, 0, 2, 2)}
            fill={colA.fl}
            stroke={colA.border}
            strokeWidth={isClassATriggered ? 2 : 1}
            filter={isClassATriggered ? "url(#red-glow)" : undefined}
          />
          <polygon
            points={flr(0, 0, 2, 2)}
            fill={isClassATriggered ? "url(#red-grid)" : "url(#iso-grid)"}
            opacity={isClassATriggered ? 0.9 : 0.4}
          />

          {/* Animated Red Overlay on Trigger */}
          {isClassATriggered && (
            <polygon
              points={flr(0, 0, 2, 2)}
              fill="rgba(255, 23, 68, 0.25)"
              className="danger-glow-anim"
            />
          )}

          {/* South Wall */}
          <polygon
            points={sw(0, 2, 2)}
            fill={colA.sw}
            stroke={colA.border}
            strokeWidth={isClassATriggered ? 1.5 : 0.6}
          />
          {/* East Wall */}
          <polygon
            points={ew(2, 0, 2)}
            fill={colA.ew}
            stroke={colA.border}
            strokeWidth={isClassATriggered ? 1.5 : 0.6}
          />

          {/* Wall Top Glowing Edges */}
          <line
            x1={iso(0, 2, 1).x}
            y1={iso(0, 2, 1).y}
            x2={iso(2, 2, 1).x}
            y2={iso(2, 2, 1).y}
            stroke={colA.ridge}
            strokeWidth={isClassATriggered ? 2.5 : 1.2}
            filter={isClassATriggered ? "url(#red-glow)" : "url(#tg)"}
          />
          <line
            x1={iso(2, 0, 1).x}
            y1={iso(2, 0, 1).y}
            x2={iso(2, 2, 1).x}
            y2={iso(2, 2, 1).y}
            stroke={colA.ridge}
            strokeWidth={isClassATriggered ? 2.5 : 1.2}
            filter={isClassATriggered ? "url(#red-glow)" : "url(#tg)"}
          />

          {/* Classroom Interior Furniture (Isometric Desks) */}
          {[
            { wx: 0.6, wy: 0.6 },
            { wx: 1.4, wy: 0.6 },
            { wx: 0.6, wy: 1.4 },
          ].map((d, i) => {
            const p = iso(d.wx, d.wy)
            return (
              <polygon
                key={i}
                points={flr(
                  d.wx - 0.2,
                  d.wy - 0.2,
                  d.wx + 0.2,
                  d.wy + 0.2,
                  0.15,
                )}
                fill={isClassATriggered ? "#5c101c" : "#10302a"}
                stroke={isClassATriggered ? "#ff3366" : "#00e5a3"}
                strokeWidth="0.5"
                opacity="0.8"
              />
            )
          })}

          {/* Teacher Board on East wall */}
          <polygon
            points={ew(1.95, 0.3, 1.1, 0.2, 0.8)}
            fill={isClassATriggered ? "#440810" : "#061c16"}
            stroke={isClassATriggered ? "#ff1744" : "#00ffcc"}
            strokeWidth="0.8"
          />

          {/* 🚨 Red Radar Ripple if Triggered */}
          {isClassATriggered && (
            <>
              <circle
                cx={iso(1, 1).x}
                cy={iso(1, 1).y}
                r="10"
                fill="none"
                stroke="#ff1744"
                strokeWidth="2"
                className="radar-ring"
              />
              <circle
                cx={iso(1, 1).x}
                cy={iso(1, 1).y}
                r="10"
                fill="none"
                stroke="#ff5252"
                strokeWidth="1.5"
                className="radar-ring-delayed"
              />
            </>
          )}

          {/* Class A Identification Pin */}
          <g transform={`translate(${iso(1, 1).x}, ${iso(1, 1).y})`}>
            {/* Card Background */}
            <rect
              x="-48"
              y="-42"
              width="96"
              height="26"
              rx="4"
              fill={isClassATriggered ? "#260408" : "#06131c"}
              stroke={colA.border}
              strokeWidth={isClassATriggered ? 2 : 1}
              filter={isClassATriggered ? "url(#red-glow)" : "url(#tg)"}
            />
            <text
              x="0"
              y="-30"
              textAnchor="middle"
              fill={colA.text}
              fontSize="10"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="700"
              letterSpacing="1"
            >
              CLASS A
            </text>
            <text
              x="0"
              y="-20"
              textAnchor="middle"
              fill={isClassATriggered ? "#ff99aa" : "#5ce0c5"}
              fontSize="7.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              NODE 1 • {isClassATriggered ? "RED ALERT" : "SECURE"}
            </text>
          </g>
        </g>

        {/* ── 4. CLASS B (Monitored by Node 2) ── */}
        <g
          className="cursor-pointer transition-all duration-300"
          onClick={() => onToggleAreaTrigger("classB")}
          onMouseEnter={() => setHoveredZone("classB")}
          onMouseLeave={() => setHoveredZone(null)}
        >
          {/* Room Floor */}
          <polygon
            points={flr(4, 4, 6, 6)}
            fill={colB.fl}
            stroke={colB.border}
            strokeWidth={isClassBTriggered ? 2 : 1}
            filter={isClassBTriggered ? "url(#red-glow)" : undefined}
          />
          <polygon
            points={flr(4, 4, 6, 6)}
            fill={isClassBTriggered ? "url(#red-grid)" : "url(#iso-grid)"}
            opacity={isClassBTriggered ? 0.9 : 0.4}
          />

          {/* Animated Red Overlay on Trigger */}
          {isClassBTriggered && (
            <polygon
              points={flr(4, 4, 6, 6)}
              fill="rgba(255, 23, 68, 0.25)"
              className="danger-glow-anim"
            />
          )}

          {/* South Wall */}
          <polygon
            points={sw(4, 6, 6)}
            fill={colB.sw}
            stroke={colB.border}
            strokeWidth={isClassBTriggered ? 1.5 : 0.6}
          />
          {/* East Wall */}
          <polygon
            points={ew(6, 4, 6)}
            fill={colB.ew}
            stroke={colB.border}
            strokeWidth={isClassBTriggered ? 1.5 : 0.6}
          />

          {/* Wall Top Glowing Edges */}
          <line
            x1={iso(4, 6, 1).x}
            y1={iso(4, 6, 1).y}
            x2={iso(6, 6, 1).x}
            y2={iso(6, 6, 1).y}
            stroke={colB.ridge}
            strokeWidth={isClassBTriggered ? 2.5 : 1.2}
            filter={isClassBTriggered ? "url(#red-glow)" : "url(#tg)"}
          />
          <line
            x1={iso(6, 4, 1).x}
            y1={iso(6, 4, 1).y}
            x2={iso(6, 6, 1).x}
            y2={iso(6, 6, 1).y}
            stroke={colB.ridge}
            strokeWidth={isClassBTriggered ? 2.5 : 1.2}
            filter={isClassBTriggered ? "url(#red-glow)" : "url(#tg)"}
          />

          {/* Classroom Interior Furniture (Workstation Pods) */}
          {[
            { wx: 4.6, wy: 4.6 },
            { wx: 5.4, wy: 4.6 },
            { wx: 4.6, wy: 5.4 },
          ].map((d, i) => {
            return (
              <polygon
                key={i}
                points={flr(
                  d.wx - 0.2,
                  d.wy - 0.2,
                  d.wx + 0.2,
                  d.wy + 0.2,
                  0.15,
                )}
                fill={isClassBTriggered ? "#5c101c" : "#10302a"}
                stroke={isClassBTriggered ? "#ff3366" : "#00e5a3"}
                strokeWidth="0.5"
                opacity="0.8"
              />
            )
          })}

          {/* Lab Presentation Screen */}
          <polygon
            points={sw(4.3, 5.1, 5.95, 0.2, 0.8)}
            fill={isClassBTriggered ? "#440810" : "#061c16"}
            stroke={isClassBTriggered ? "#ff1744" : "#00ffcc"}
            strokeWidth="0.8"
          />

          {/* 🚨 Red Radar Ripple if Triggered */}
          {isClassBTriggered && (
            <>
              <circle
                cx={iso(5, 5).x}
                cy={iso(5, 5).y}
                r="10"
                fill="none"
                stroke="#ff1744"
                strokeWidth="2"
                className="radar-ring"
              />
              <circle
                cx={iso(5, 5).x}
                cy={iso(5, 5).y}
                r="10"
                fill="none"
                stroke="#ff5252"
                strokeWidth="1.5"
                className="radar-ring-delayed"
              />
            </>
          )}

          {/* Class B Identification Pin */}
          <g transform={`translate(${iso(5, 5).x}, ${iso(5, 5).y})`}>
            {/* Card Background */}
            <rect
              x="-48"
              y="-42"
              width="96"
              height="26"
              rx="4"
              fill={isClassBTriggered ? "#260408" : "#06131c"}
              stroke={colB.border}
              strokeWidth={isClassBTriggered ? 2 : 1}
              filter={isClassBTriggered ? "url(#red-glow)" : "url(#tg)"}
            />
            <text
              x="0"
              y="-30"
              textAnchor="middle"
              fill={colB.text}
              fontSize="10"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="700"
              letterSpacing="1"
            >
              CLASS B
            </text>
            <text
              x="0"
              y="-20"
              textAnchor="middle"
              fill={isClassBTriggered ? "#ff99aa" : "#5ce0c5"}
              fontSize="7.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              NODE 2 • {isClassBTriggered ? "RED ALERT" : "SECURE"}
            </text>
          </g>
        </g>

        {/* ── 5. EXIT B (North Exit - Monitored by Node 3) ── */}
        <g
          className="cursor-pointer transition-all duration-300"
          onClick={() => onToggleAreaTrigger("exitB")}
          onMouseEnter={() => setHoveredZone("exitB")}
          onMouseLeave={() => setHoveredZone(null)}
        >
          {/* Exit B Floor Threshold */}
          <polygon
            points={flr(2, 0, 4, 1.8)}
            fill={colExitB.fl}
            stroke={colExitB.border}
            strokeWidth={isExitBTriggered ? 2 : 1}
            filter={isExitBTriggered ? "url(#red-glow)" : undefined}
          />
          <polygon
            points={flr(2, 0, 4, 1.8)}
            fill={
              isExitBTriggered ? "url(#hazard-stripes)" : "url(#safe-stripes)"
            }
            opacity={0.8}
          />

          {/* Exit B Portal Beam */}
          {(() => {
            const p1 = iso(2, 0)
            const p2 = iso(4, 0)
            const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
            return (
              <>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={colExitB.glow}
                  strokeWidth={isExitBTriggered ? 4 : 2.5}
                  filter={isExitBTriggered ? "url(#red-glow)" : "url(#tg)"}
                />
                {/* Overhead EXIT B Badge */}
                <g transform={`translate(${mid.x}, ${mid.y - 14})`}>
                  <rect
                    x="-42"
                    y="-16"
                    width="84"
                    height="20"
                    rx="3"
                    fill={isExitBTriggered ? "#30060c" : "#051815"}
                    stroke={colExitB.border}
                    strokeWidth={isExitBTriggered ? 2 : 1}
                    filter={isExitBTriggered ? "url(#red-glow)" : "url(#tg)"}
                  />
                  <text
                    x="0"
                    y="-3"
                    textAnchor="middle"
                    fill={colExitB.text}
                    fontSize="9.5"
                    fontFamily="Barlow Condensed, sans-serif"
                    fontWeight="700"
                    letterSpacing="1.5"
                  >
                    EXIT B (NORTH)
                  </text>
                  <text
                    x="0"
                    y="12"
                    textAnchor="middle"
                    fill={isExitBTriggered ? "#ff3366" : "#00ffcc"}
                    fontSize="7"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {isExitBTriggered
                      ? "⚠️ TRIGGERED [NODE 3]"
                      : "NODE 3 • OPEN"}
                  </text>
                </g>
              </>
            )
          })()}

          {/* Radar Ripple if Exit B is Triggered */}
          {isExitBTriggered && (
            <circle
              cx={iso(3, 0.8).x}
              cy={iso(3, 0.8).y}
              r="12"
              fill="none"
              stroke="#ff1744"
              strokeWidth="2"
              className="radar-ring"
            />
          )}
        </g>

        {/* ── 6. EXIT A (South Exit - Monitored by Node 3) ── */}
        <g
          className="cursor-pointer transition-all duration-300"
          onClick={() => onToggleAreaTrigger("exitA")}
          onMouseEnter={() => setHoveredZone("exitA")}
          onMouseLeave={() => setHoveredZone(null)}
        >
          {/* Exit A Floor Threshold */}
          <polygon
            points={flr(2, 4.2, 4, 6)}
            fill={colExitA.fl}
            stroke={colExitA.border}
            strokeWidth={isExitATriggered ? 2 : 1}
            filter={isExitATriggered ? "url(#red-glow)" : undefined}
          />
          <polygon
            points={flr(2, 4.2, 4, 6)}
            fill={
              isExitATriggered ? "url(#hazard-stripes)" : "url(#safe-stripes)"
            }
            opacity={0.8}
          />

          {/* Exit A Portal Beam */}
          {(() => {
            const p1 = iso(2, 6)
            const p2 = iso(4, 6)
            const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
            return (
              <>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={colExitA.glow}
                  strokeWidth={isExitATriggered ? 4 : 2.5}
                  filter={isExitATriggered ? "url(#red-glow)" : "url(#tg)"}
                />
                {/* Overhead EXIT A Badge */}
                <g transform={`translate(${mid.x}, ${mid.y + 24})`}>
                  <rect
                    x="-42"
                    y="-14"
                    width="84"
                    height="20"
                    rx="3"
                    fill={isExitATriggered ? "#30060c" : "#051815"}
                    stroke={colExitA.border}
                    strokeWidth={isExitATriggered ? 2 : 1}
                    filter={isExitATriggered ? "url(#red-glow)" : "url(#tg)"}
                  />
                  <text
                    x="0"
                    y="-1"
                    textAnchor="middle"
                    fill={colExitA.text}
                    fontSize="9.5"
                    fontFamily="Barlow Condensed, sans-serif"
                    fontWeight="700"
                    letterSpacing="1.5"
                  >
                    EXIT A (SOUTH)
                  </text>
                  <text
                    x="0"
                    y="14"
                    textAnchor="middle"
                    fill={isExitATriggered ? "#ff3366" : "#00ffcc"}
                    fontSize="7"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {isExitATriggered
                      ? "⚠️ TRIGGERED [NODE 3]"
                      : "NODE 3 • OPEN"}
                  </text>
                </g>
              </>
            )
          })()}

          {/* Radar Ripple if Exit A is Triggered */}
          {isExitATriggered && (
            <circle
              cx={iso(3, 5.2).x}
              cy={iso(3, 5.2).y}
              r="12"
              fill="none"
              stroke="#ff1744"
              strokeWidth="2"
              className="radar-ring"
            />
          )}
        </g>

        {/* ── 7. TELEMETRY NETWORK CONDUITS ── */}
        {/* Node 3 to Exit B (North) */}
        <line
          x1={iso(3, 3).x}
          y1={iso(3, 3).y}
          x2={iso(3, 0.5).x}
          y2={iso(3, 0.5).y}
          stroke={isExitBTriggered ? "#ff1744" : "#00ffcc"}
          strokeWidth={isExitBTriggered ? 3 : 1.8}
          className={isExitBTriggered ? "net-line-alert" : "net-line"}
          filter={isExitBTriggered ? "url(#red-glow)" : "url(#net-glow)"}
        />

        {/* Node 3 to Exit A (South) */}
        <line
          x1={iso(3, 3).x}
          y1={iso(3, 3).y}
          x2={iso(3, 5.5).x}
          y2={iso(3, 5.5).y}
          stroke={isExitATriggered ? "#ff1744" : "#00ffcc"}
          strokeWidth={isExitATriggered ? 3 : 1.8}
          className={isExitATriggered ? "net-line-alert" : "net-line"}
          filter={isExitATriggered ? "url(#red-glow)" : "url(#net-glow)"}
        />

        {/* Node 1 (Class A) to Node 3 Central Controller */}
        <line
          x1={iso(1, 1).x}
          y1={iso(1, 1).y}
          x2={iso(3, 3).x}
          y2={iso(3, 3).y}
          stroke={isClassATriggered ? "#ff1744" : "#00e5a3"}
          strokeWidth={isClassATriggered ? 2.5 : 1.2}
          opacity="0.85"
          className={isClassATriggered ? "net-line-alert" : "net-line"}
        />

        {/* Node 2 (Class B) to Node 3 Central Controller */}
        <line
          x1={iso(5, 5).x}
          y1={iso(5, 5).y}
          x2={iso(3, 3).x}
          y2={iso(3, 3).y}
          stroke={isClassBTriggered ? "#ff1744" : "#00e5a3"}
          strokeWidth={isClassBTriggered ? 2.5 : 1.2}
          opacity="0.85"
          className={isClassBTriggered ? "net-line-alert" : "net-line"}
        />

        {/* ── 8. SENSOR HARDWARE NODES (Node 1, Node 2, Node 3) ── */}

        {/* NODE 1 (Class A Sensor Hub) */}
        {(() => {
          const p = iso(1, 1)
          const c = isClassATriggered ? "#ff1744" : "#00ffcc"
          return (
            <g transform={`translate(${p.x}, ${p.y})`}>
              <circle cx="0" cy="0" r="14" fill={c} opacity="0.12" />
              {/* Chip body */}
              <rect
                x="-8"
                y="-6"
                width="16"
                height="12"
                rx="2"
                fill="#07151e"
                stroke={c}
                strokeWidth={isClassATriggered ? 2 : 1}
              />
              {/* Chip Pins */}
              {[-4, 0, 4].map((dx) => (
                <line
                  key={dx}
                  x1={dx}
                  y1="-6"
                  x2={dx}
                  y2="-8"
                  stroke={c}
                  strokeWidth="0.8"
                />
              ))}
              {[-4, 0, 4].map((dx) => (
                <line
                  key={dx}
                  x1={dx}
                  y1="6"
                  x2={dx}
                  y2="8"
                  stroke={c}
                  strokeWidth="0.8"
                />
              ))}
              {/* Center status LED */}
              <circle
                cx="0"
                cy="0"
                r="3"
                fill={c}
                className={isClassATriggered ? "beacon-flash" : "safe-pulse"}
              />
            </g>
          )
        })()}

        {/* NODE 2 (Class B Sensor Hub) */}
        {(() => {
          const p = iso(5, 5)
          const c = isClassBTriggered ? "#ff1744" : "#00ffcc"
          return (
            <g transform={`translate(${p.x}, ${p.y})`}>
              <circle cx="0" cy="0" r="14" fill={c} opacity="0.12" />
              {/* Chip body */}
              <rect
                x="-8"
                y="-6"
                width="16"
                height="12"
                rx="2"
                fill="#07151e"
                stroke={c}
                strokeWidth={isClassBTriggered ? 2 : 1}
              />
              {/* Chip Pins */}
              {[-4, 0, 4].map((dx) => (
                <line
                  key={dx}
                  x1={dx}
                  y1="-6"
                  x2={dx}
                  y2="-8"
                  stroke={c}
                  strokeWidth="0.8"
                />
              ))}
              {[-4, 0, 4].map((dx) => (
                <line
                  key={dx}
                  x1={dx}
                  y1="6"
                  x2={dx}
                  y2="8"
                  stroke={c}
                  strokeWidth="0.8"
                />
              ))}
              {/* Center status LED */}
              <circle
                cx="0"
                cy="0"
                r="3"
                fill={c}
                className={isClassBTriggered ? "beacon-flash" : "safe-pulse"}
              />
            </g>
          )
        })()}

        {/* NODE 3 (Dual Exit Controller - Monitors Exit A & Exit B) */}
        {(() => {
          const p = iso(3, 3)
          const isNode3Alert = isExitATriggered || isExitBTriggered
          const c = isNode3Alert ? "#ff1744" : "#00ffcc"
          return (
            <g
              transform={`translate(${p.x}, ${p.y})`}
              className="cursor-pointer"
              onClick={() => onSelectArea(null)}
            >
              {/* Controller Pedestal Glow */}
              <circle
                cx="0"
                cy="0"
                r="22"
                fill={c}
                opacity="0.15"
                filter={isNode3Alert ? "url(#red-glow)" : "url(#tg)"}
              />
              {/* Dual-Exit Hub Polygon */}
              <polygon
                points="-14,-8 14,-8 18,0 14,8 -14,8 -18,0"
                fill="#081420"
                stroke={c}
                strokeWidth={isNode3Alert ? 2 : 1.2}
              />
              {/* Antennas for Exit A & Exit B */}
              <line
                x1="-8"
                y1="-8"
                x2="-14"
                y2="-18"
                stroke={c}
                strokeWidth="1.2"
              />
              <circle cx="-14" cy="-18" r="2" fill={c} />
              <line
                x1="8"
                y1="-8"
                x2="14"
                y2="-18"
                stroke={c}
                strokeWidth="1.2"
              />
              <circle cx="14" cy="-18" r="2" fill={c} />

              {/* Status Core LED */}
              <circle
                cx="0"
                cy="0"
                r="4"
                fill={c}
                className={isNode3Alert ? "beacon-flash" : "safe-pulse"}
              />

              {/* Node 3 Label Pin */}
              <rect
                x="-64"
                y="14"
                width="128"
                height="24"
                rx="3"
                fill="#040c14"
                stroke={c}
                strokeWidth={isNode3Alert ? 1.5 : 0.8}
                opacity="0.95"
              />
              <text
                x="0"
                y="25"
                textAnchor="middle"
                fill={c}
                fontSize="8.5"
                fontFamily="Barlow Condensed, sans-serif"
                fontWeight="700"
                letterSpacing="0.8"
              >
                NODE 3 — DUAL EXIT HUB
              </text>
              <text
                x="0"
                y="34"
                textAnchor="middle"
                fill={isNode3Alert ? "#ff99aa" : "#5ce0c5"}
                fontSize="6.8"
                fontFamily="JetBrains Mono, monospace"
              >
                {isNode3Alert
                  ? `ALERT: ${
                      isExitATriggered && isExitBTriggered
                        ? "EXIT A & B"
                        : isExitATriggered
                          ? "EXIT A"
                          : "EXIT B"
                    }`
                  : "EXIT A & EXIT B: LINK NORMAL"}
              </text>
            </g>
          )
        })()}

        {/* ── 9. DYNAMIC EVACUATION PATHWAY OVERLAY ── */}
        {/* If Exit A is triggered in RED, route to Exit B */}
        {isExitATriggered && !isExitBTriggered && (
          <g>
            <text
              x="20"
              y="32"
              fill="#00ffcc"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              ▶ EVACUATION REROUTE: Exit A Compromised → Directing to EXIT B
              (North)
            </text>
          </g>
        )}
        {/* If Exit B is triggered in RED, route to Exit A */}
        {isExitBTriggered && !isExitATriggered && (
          <g>
            <text
              x="20"
              y="32"
              fill="#00ffcc"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              ▶ EVACUATION REROUTE: Exit B Compromised → Directing to EXIT A
              (South)
            </text>
          </g>
        )}
        {/* If both Exits are triggered */}
        {isExitATriggered && isExitBTriggered && (
          <g>
            <text
              x="20"
              y="32"
              fill="#ff3366"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              ⚠️ CRITICAL: BOTH EXITS COMPROMISED → SHELTER-IN-PLACE ACTIVATED
            </text>
          </g>
        )}
        {!isExitATriggered && !isExitBTriggered && (
          <g>
            <text
              x="20"
              y="32"
              fill="#00e5a3"
              fontSize="8.5"
              fontFamily="JetBrains Mono, monospace"
              opacity="0.8"
            >
              ✔ NORMAL MONITORING: Class A (Node 1) • Class B (Node 2) • Exits A
              & B (Node 3)
            </text>
          </g>
        )}

        {/* Floating Interactive Hint */}
        <text
          x="720"
          y="435"
          textAnchor="end"
          fill="#406080"
          fontSize="7.5"
          fontFamily="JetBrains Mono, monospace"
        >
          💡 Tip: Click any Classroom or Exit to trigger/reset its alert state
        </text>
      </svg>
    </div>
  )
}
