import { useNavigate } from "react-router-dom";
import {
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { fmtPct, fmtCrTable, signClass, chartColor } from "./format";
import { makeTooltipContent } from "./ChartTooltip";
export default function SchemeUniversePanel({ schemes }) {
  const navigate = useNavigate();
  const data = schemes
    .filter(
      (s) =>
        s.return_1y !== null &&
        s.return_1y !== undefined &&
        s.return_3y !== null &&
        s.return_3y !== undefined,
    )
    .filter((s) => Math.abs(s.return_1y) < 200 && Math.abs(s.return_3y) < 200)
    .slice(0, 400);
  const categories = [...new Set(data.map((d) => d.category))].sort();
  const colorByCategory = Object.fromEntries(
    categories.map((c, i) => [c, chartColor(i)]),
  );
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.scheme_name,
    subtitle: `${d.category} — ${d.fund_house}`,
    rows: [
      {
        label: "1Y Return",
        value: fmtPct(d.return_1y, 1),
        className: signClass(d.return_1y),
      },
      {
        label: "3Y Return",
        value: fmtPct(d.return_3y, 1),
        className: signClass(d.return_3y),
      },
      {
        label: "AUM",
        value: fmtCrTable(d.latest_aum),
      },
    ],
  }));
  if (!data.length) return null;
  return (
    <div
      className="fi-panel fi-panel-pad"
      style={{
        marginBottom: 14,
      }}
    >
      <div className="fi-card-title">1Y vs 3Y Return — by Scheme</div>
      <div className="fi-card-subtitle">
        Bubble size = AUM, colored by category — top-right is consistently
        strong, top-left/bottom-right flags a recent swing (showing top{" "}
        {data.length} by AUM with return data)
      </div>
      <div
        style={{
          height: 440,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 10,
              right: 20,
              bottom: 10,
              left: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey="return_1y"
              name="1Y Return"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              label={{
                value: "1Y Return",
                position: "insideBottom",
                offset: -5,
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
            />
            <YAxis
              type="number"
              dataKey="return_3y"
              name="3Y Return"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              label={{
                value: "3Y Return",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
            />
            <ZAxis type="number" dataKey="latest_aum" range={[20, 350]} />
            <ReferenceLine
              x={0}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
            <ReferenceLine
              y={0}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{
                strokeDasharray: "3 3",
              }}
            />
            <Scatter
              data={data}
              onClick={(d) =>
                navigate(`/flow-intelligence/scheme/${d.scheme_id}`)
              }
              style={{
                cursor: "pointer",
              }}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={colorByCategory[d.category]}
                  fillOpacity={0.6}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
