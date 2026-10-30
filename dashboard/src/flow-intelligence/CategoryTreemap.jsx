import { useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { fmtRatioPct } from "./format";
function colorFor(flowIntensity) {
  if (flowIntensity === null || flowIntensity === undefined)
    return "var(--panel-sunken)";
  const pct = flowIntensity * 100;
  const clamped = Math.max(-2, Math.min(2, pct));
  const t = (clamped + 2) / 4;
  if (t < 0.5) {
    const k = t / 0.5;
    return mix("#C62A2F", "#3A3F4A", k);
  }
  const k = (t - 0.5) / 0.5;
  return mix("#3A3F4A", "#1A9A5C", k);
}
function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA),
    b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}
function TreemapCell({
  x,
  y,
  width,
  height,
  name,
  flowIntensity,
  hoveredName,
  setHoveredName,
}) {
  if (width < 2 || height < 2) return null;
  const showLabel = width > 50 && height > 28;
  const isHovered = hoveredName === name;
  return (
    <g
      onMouseEnter={() => setHoveredName(name)}
      onMouseLeave={() => setHoveredName(null)}
      style={{
        cursor: "pointer",
      }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colorFor(flowIntensity)}
        stroke={isHovered ? "#fff" : "var(--bg)"}
        strokeWidth={isHovered ? 2.5 : 1.5}
        style={{
          filter: isHovered ? "brightness(1.25)" : "none",
          transition: "filter 0.08s ease",
        }}
      />
      {isHovered && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke="#fff"
          strokeWidth={1}
          strokeDasharray="3 2"
          style={{
            pointerEvents: "none",
          }}
        />
      )}
      {showLabel && (
        <>
          <text
            x={x + 6}
            y={y + 16}
            fontSize={11}
            fontWeight={700}
            fill="#fff"
            stroke="rgba(0,0,0,0.55)"
            strokeWidth={3}
            paintOrder="stroke"
            style={{
              pointerEvents: "none",
            }}
          >
            {name}
          </text>
          <text
            x={x + 6}
            y={y + 30}
            fontSize={10}
            fontFamily="var(--mono)"
            fontWeight={600}
            fill="#fff"
            stroke="rgba(0,0,0,0.55)"
            strokeWidth={3}
            paintOrder="stroke"
            style={{
              pointerEvents: "none",
            }}
          >
            {fmtRatioPct(flowIntensity)}
          </text>
        </>
      )}
    </g>
  );
}
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="fi-panel fi-panel-pad"
      style={{
        fontSize: 11,
        color: "var(--text)",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: "var(--text)",
        }}
      >
        {d.name}
      </div>
      <div className="fi-dim">
        AUM: {Math.round(d.size).toLocaleString("en-IN")} Cr
      </div>
      <div className="fi-dim">
        Flow Intensity 1D: {fmtRatioPct(d.flowIntensity)}
      </div>
    </div>
  );
}
export default function CategoryTreemap({ categories, categoryIdByName }) {
  const navigate = useNavigate();
  const [hoveredName, setHoveredName] = useState(null);
  const data = categories
    .filter((c) => c.latest_aum > 0)
    .map((c) => ({
      name: c.category,
      size: Number(c.latest_aum),
      flowIntensity: c.flow_intensity_1d,
    }));
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Category Heatmap</div>
      <div className="fi-card-subtitle">
        Size = AUM, color = net flow intensity 1D (red = outflow, green =
        inflow)
      </div>
      <div
        style={{
          height: 320,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="var(--bg)"
            content={
              <TreemapCell
                hoveredName={hoveredName}
                setHoveredName={setHoveredName}
              />
            }
            isAnimationActive={false}
            onClick={(node) => {
              const id = categoryIdByName[node?.name];
              if (id) navigate(`/flow-intelligence/category/${id}`);
            }}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
