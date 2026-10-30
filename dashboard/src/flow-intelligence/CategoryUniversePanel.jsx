import { useEffect, useState } from "react";
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
import { fetchCategoryUniverseStats, fetchLatestDate } from "./api";
import {
  fmtRatioPct,
  fmtCrTable,
  signClass,
  median,
  chartColor,
} from "./format";
import { makeTooltipContent } from "./ChartTooltip";
import CategoryTreemap from "./CategoryTreemap";
function QuadrantScatter({ categories, categoryIdByName }) {
  const navigate = useNavigate();
  const data = categories
    .filter((c) => c.latest_aum > 0 && c.flow_intensity_30d !== null)
    .map((c) => ({
      ...c,
      logAum: Math.log10(c.latest_aum),
      absSales1d: Math.abs(Number(c.sales_1d || 0)),
    }));
  const assetClasses = [...new Set(data.map((d) => d.asset_class))].sort();
  const colorByClass = Object.fromEntries(
    assetClasses.map((ac, i) => [ac, chartColor(i)]),
  );
  const medAum = median(data.map((d) => d.logAum));
  const medFlow = median(data.map((d) => d.flow_intensity_30d));
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.category,
    subtitle: d.asset_class,
    rows: [
      {
        label: "AUM",
        value: fmtCrTable(d.latest_aum),
      },
      {
        label: "Flow Intensity 30D",
        value: fmtRatioPct(d.flow_intensity_30d),
        className: signClass(d.flow_intensity_30d),
      },
      {
        label: "Net Sales 1D",
        value: fmtCrTable(d.sales_1d),
        className: signClass(d.sales_1d),
      },
    ],
  }));
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Size vs. Momentum — by Category</div>
      <div className="fi-card-subtitle">
        AUM (log scale) vs 30D flow intensity, colored by asset class — reveals
        which parts of the industry are rotating in or out right now
      </div>
      <div
        style={{
          height: 400,
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
              dataKey="logAum"
              name="AUM"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                `${Math.round(Math.pow(10, v)).toLocaleString("en-IN")} Cr`
              }
              label={{
                value: "AUM (log scale)",
                position: "insideBottom",
                offset: -5,
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
            />
            <YAxis
              type="number"
              dataKey="flow_intensity_30d"
              name="Flow Intensity 30D"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
              label={{
                value: "Flow Intensity 30D",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
            />
            <ZAxis type="number" dataKey="absSales1d" range={[30, 400]} />
            <ReferenceLine
              x={medAum}
              stroke="var(--border-strong)"
              strokeDasharray="4 3"
            />
            <ReferenceLine
              y={medFlow}
              stroke="var(--border-strong)"
              strokeDasharray="4 3"
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
                categoryIdByName[d.category] &&
                navigate(
                  `/flow-intelligence/category/${categoryIdByName[d.category]}`,
                )
              }
              style={{
                cursor: "pointer",
              }}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={colorByClass[d.asset_class]}
                  fillOpacity={0.75}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 14px",
          marginTop: 8,
        }}
      >
        {assetClasses.map((ac) => (
          <div
            key={ac}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: colorByClass[ac],
                flexShrink: 0,
              }}
            />
            <span className="fi-dim">{ac}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function CategoryUniversePanel({
  categories,
  categoryIdByName,
}) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchLatestDate()
      .then((d) => fetchCategoryUniverseStats(d))
      .then((res) => setStats(res.categories))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div
      className="fi-section-grid"
      style={{
        marginBottom: 14,
      }}
    >
      {error ? (
        <div className="fi-panel fi-panel-pad fi-neg">
          Failed to load: {error}
        </div>
      ) : !stats ? (
        <div className="fi-panel fi-panel-pad fi-dim">Loading…</div>
      ) : (
        <QuadrantScatter
          categories={stats}
          categoryIdByName={categoryIdByName}
        />
      )}
      <CategoryTreemap
        categories={categories}
        categoryIdByName={categoryIdByName}
      />
    </div>
  );
}
