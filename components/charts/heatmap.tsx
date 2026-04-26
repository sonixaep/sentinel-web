/* components/charts/heatmap.tsx */
"use client"

import { Fragment, useState } from "react"

interface HeatmapProps {
  data: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  color?: string
  maxOverride?: number
}

const DEFAULT_ROWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DEFAULT_COLS = Array.from({ length: 24 }, (_, i) => `${i}`)

export function Heatmap({
  data,
  rowLabels,
  colLabels,
  color = "var(--color-chart-1)",
  maxOverride,
}: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ row: number; col: number } | null>(null)

  const max  = maxOverride ?? Math.max(...data.flat(), 1)
  const rows = rowLabels ?? DEFAULT_ROWS
  const cols = colLabels ?? DEFAULT_COLS

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: `36px repeat(${cols.length}, 1fr)`,
          minWidth: 480,
        }}
      >
        {/* Header row */}
        <div />
        {cols.map((label, i) => (
          <div
            key={i}
            className="text-center text-[9px] text-muted-foreground pb-1 leading-none"
          >
            {i % 3 === 0 ? label : ""}
          </div>
        ))}

        {/* Data rows — Fragment with key fixes the missing-key warning */}
        {data.map((row, rowIdx) => (
          <Fragment key={rowIdx}>
            <div className="flex items-center justify-end pr-2 text-[10px] text-muted-foreground leading-none">
              {rows[rowIdx]}
            </div>
            {row.map((value, colIdx) => {
              const opacity = max > 0 ? value / max : 0
              const isHover = tooltip?.row === rowIdx && tooltip?.col === colIdx

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className="relative rounded-[3px] transition-all duration-100 cursor-default"
                  style={{
                    minHeight: 14,
                    backgroundColor:
                      opacity > 0 ? color : "var(--color-secondary)",
                    opacity: opacity > 0 ? 0.15 + opacity * 0.85 : 0.4,
                    transform: isHover ? "scale(1.3)" : "scale(1)",
                    zIndex: isHover ? 10 : 1,
                    boxShadow: isHover && opacity > 0 ? `0 0 6px ${color}80` : "none",
                  }}
                  onMouseEnter={() => setTooltip({ row: rowIdx, col: colIdx })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {isHover && value > 0 && (
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium pointer-events-none z-20"
                      style={{
                        backgroundColor: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-foreground)",
                      }}
                    >
                      {rows[rowIdx]} {cols[colIdx]}:00 — {value} events
                    </div>
                  )}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground">Less</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 1].map((o, i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{
                backgroundColor: o > 0.05 ? color : "var(--color-secondary)",
                opacity: o > 0.05 ? 0.15 + o * 0.85 : 0.4,
              }}
            />
          ))}
        </div>
        <span className="text-[9px] text-muted-foreground">More</span>
      </div>
    </div>
  )
}