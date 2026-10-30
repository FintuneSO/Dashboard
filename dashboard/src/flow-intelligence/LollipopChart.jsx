import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
function ClickableYTick({ x, y, payload, onNameClick }) {
  const clickable = !!onNameClick;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      width={130}
      fontSize={10.5}
      fill={clickable ? "var(--accent)" : "var(--text-dim)"}
      style={{
        cursor: clickable ? "pointer" : "default",
        textDecoration: clickable ? "underline" : "none",
      }}
      onClick={clickable ? () => onNameClick(payload.value) : undefined}
    >
      {payload.value}
    </text>
  );
}
export default function LollipopChart({
  data,
  dataKey,
  nameKey,
  tooltipContent,
  height,
  xTickFormatter,
  onNameClick,
}) {
  const stemData = data.map((d) => ({
    ...d,
    _stemWidth: 3,
  }));
  return (
    <div
      style={{
        height: height || Math.max(180, data.length * 28),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={stemData}
          layout="vertical"
          margin={{
            left: 8,
            right: 24,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{
              fontSize: 10,
              fill: "var(--text-faint)",
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={130}
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={
              onNameClick ? (
                <ClickableYTick onNameClick={onNameClick} />
              ) : (
                {
                  fontSize: 10.5,
                  fill: "var(--text-dim)",
                }
              )
            }
          />
          <ReferenceLine x={0} stroke="var(--border-strong)" strokeWidth={1} />
          <Tooltip
            content={tooltipContent}
            cursor={{
              fill: "var(--panel-sunken)",
            }}
          />
          <Bar dataKey={dataKey} barSize={2} isAnimationActive={false}>
            {stemData.map((d, i) => (
              <Cell
                key={i}
                fill={d[dataKey] >= 0 ? "var(--pos)" : "var(--neg)"}
              />
            ))}
          </Bar>
          <Scatter dataKey={dataKey} isAnimationActive={false}>
            {stemData.map((d, i) => (
              <Cell
                key={i}
                fill={d[dataKey] >= 0 ? "var(--pos)" : "var(--neg)"}
                r={5}
              />
            ))}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
