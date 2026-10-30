import { useState } from "react";
import { chartColor } from "./format";
export default function StackedBarComposition({
  rows,
  nameKey,
  valueKey,
  onSegmentClick,
  formatValue,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const total = rows.reduce((s, r) => s + Number(r[valueKey] || 0), 0);
  const sorted = [...rows].sort((a, b) => b[valueKey] - a[valueKey]);
  return (
    <div>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 56,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        {sorted.map((r, i) => {
          const pct = (r[valueKey] / total) * 100;
          return (
            <div
              key={r[nameKey]}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => onSegmentClick && onSegmentClick(r[nameKey])}
              style={{
                width: `${pct}%`,
                background: chartColor(i),
                cursor: onSegmentClick ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.12s ease",
                opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.45,
                borderRight:
                  i < sorted.length - 1 ? "1.5px solid var(--bg)" : "none",
                position: "relative",
              }}
              title={`${r[nameKey]}: ${pct.toFixed(1)}%`}
            >
              {pct > 7 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 16px",
          marginTop: 12,
        }}
      >
        {sorted.map((r, i) => (
          <div
            key={r[nameKey]}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => onSegmentClick && onSegmentClick(r[nameKey])}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              cursor: onSegmentClick ? "pointer" : "default",
              opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.45,
              transition: "opacity 0.12s ease",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                background: chartColor(i),
                flexShrink: 0,
              }}
            />
            <span className="fi-dim">{r[nameKey]}</span>
            <span
              className="fi-num"
              style={{
                fontSize: 11,
              }}
            >
              {formatValue ? formatValue(r[valueKey]) : r[valueKey]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
