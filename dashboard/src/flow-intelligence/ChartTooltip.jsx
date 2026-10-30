export default function ChartTooltip({ title, subtitle, rows }) {
  return (
    <div className="fi-panel fi-panel-pad fi-chart-tooltip">
      {title && <div className="fi-chart-tooltip-title">{title}</div>}
      {subtitle && <div className="fi-chart-tooltip-subtitle">{subtitle}</div>}
      {rows?.map((r, i) => (
        <div key={i} className="fi-chart-tooltip-row">
          <span className="fi-faint">{r.label}</span>
          <span className={`fi-num ${r.className || ""}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
export function makeTooltipContent(buildProps) {
  return ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const datum = payload[0].payload;
    const props = buildProps(datum, payload);
    if (!props) return null;
    return <ChartTooltip {...props} />;
  };
}
