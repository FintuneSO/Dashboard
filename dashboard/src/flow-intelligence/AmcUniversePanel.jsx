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
import { fetchAmcUniverseStats, fetchLatestDate } from "./api";
import {
  fmtRatioPct,
  fmtCrTable,
  fmtPct,
  signClass,
  median,
  hhi,
  hhiBand,
} from "./format";
import { makeTooltipContent } from "./ChartTooltip";
import InfoTooltip from "./InfoTooltip";
import { METRIC_HELP } from "./metricHelp";
function QuadrantScatter({ amcs, amcIdByName }) {
  const navigate = useNavigate();
  const data = amcs
    .filter((a) => a.latest_aum > 0 && a.flow_intensity_30d !== null)
    .map((a) => ({
      ...a,
      logAum: Math.log10(a.latest_aum),
      absSales1d: Math.abs(Number(a.sales_1d || 0)),
    }));
  const medAum = median(data.map((d) => d.logAum));
  const medFlow = median(data.map((d) => d.flow_intensity_30d));
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.fund_house_name,
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
      <div className="fi-card-title">Size vs. Momentum</div>
      <div className="fi-card-subtitle">
        AUM (log scale) vs 30D flow intensity, bubble size = 1D net sales
        magnitude — dashed lines mark the industry median on each axis
      </div>
      <div
        style={{
          height: 380,
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
                amcIdByName[d.fund_house_name] &&
                navigate(
                  `/flow-intelligence/amc/${amcIdByName[d.fund_house_name]}`,
                )
              }
              style={{
                cursor: "pointer",
              }}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.flow_intensity_30d >= 0 ? "var(--pos)" : "var(--neg)"}
                  fillOpacity={0.65}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function BreadthStrip({ amcs }) {
  const windows = [
    {
      key: "flow_intensity_1d",
      label: "1D",
    },
    {
      key: "flow_intensity_7d",
      label: "7D",
    },
    {
      key: "flow_intensity_30d",
      label: "30D",
    },
  ];
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Market Breadth</div>
      <div className="fi-card-subtitle">
        How many AMCs are inflowing vs outflowing, by window
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        {windows.map((w) => {
          const vals = amcs
            .map((a) => a[w.key])
            .filter((v) => v !== null && v !== undefined);
          const up = vals.filter((v) => v > 0).length;
          const down = vals.filter((v) => v < 0).length;
          const total = up + down;
          const upPct = total ? (up / total) * 100 : 0;
          return (
            <div
              key={w.key}
              style={{
                flex: "1 1 160px",
                minWidth: 150,
              }}
            >
              <div
                className="fi-dim"
                style={{
                  fontSize: 11,
                  marginBottom: 4,
                }}
              >
                {w.label}
              </div>
              <div
                style={{
                  display: "flex",
                  height: 10,
                  borderRadius: 5,
                  overflow: "hidden",
                  background: "var(--panel-sunken)",
                }}
              >
                <div
                  style={{
                    width: `${upPct}%`,
                    background: "var(--pos)",
                  }}
                />
                <div
                  style={{
                    width: `${100 - upPct}%`,
                    background: "var(--neg)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                <span className="fi-pos">{up} up</span>
                <span className="fi-neg">{down} down</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function ConcentrationTile({ amcs }) {
  const sorted = [...amcs].sort((a, b) => b.latest_aum - a.latest_aum);
  const total = sorted.reduce((s, a) => s + Number(a.latest_aum || 0), 0);
  const top5 = sorted
    .slice(0, 5)
    .reduce((s, a) => s + Number(a.latest_aum || 0), 0);
  const score = hhi(amcs.map((a) => a.latest_aum));
  const medGap = median(amcs.map((a) => a.avg_return_gap_1y));
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Industry Structure</div>
      <div className="fi-card-subtitle">
        Concentration and the Direct vs Regular expense drag, across all{" "}
        {amcs.length} AMCs
      </div>
      <div
        className="fi-stat-strip"
        style={{
          marginTop: 10,
        }}
      >
        <div className="fi-stat-tile">
          <div className="fi-stat-label">
            HHI Concentration<InfoTooltip>{METRIC_HELP.hhi}</InfoTooltip>
          </div>
          <div className="fi-stat-value">{score ? Math.round(score) : "—"}</div>
          <div
            className="fi-dim"
            style={{
              fontSize: 11,
            }}
          >
            {hhiBand(score)}
          </div>
        </div>
        <div className="fi-stat-tile">
          <div className="fi-stat-label">
            Top 5 AUM Share<InfoTooltip>{METRIC_HELP.topAumShare}</InfoTooltip>
          </div>
          <div className="fi-stat-value">
            {total ? `${((top5 / total) * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
        <div className="fi-stat-tile">
          <div className="fi-stat-label">Median Direct/Regular Gap (1Y)</div>
          <div className={`fi-stat-value ${signClass(medGap)}`}>
            {medGap !== null ? fmtPct(medGap, 2) : "—"}
          </div>
          <div
            className="fi-dim"
            style={{
              fontSize: 11,
            }}
          >
            Avg. return edge of Direct over Regular plans, per AMC
          </div>
        </div>
      </div>
    </div>
  );
}
export default function AmcUniversePanel({ amcIdByName }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchLatestDate()
      .then((d) => fetchAmcUniverseStats(d))
      .then((res) => setStats(res.amcs))
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!stats)
    return <div className="fi-panel fi-panel-pad fi-dim">Loading…</div>;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        marginBottom: 14,
      }}
    >
      <div className="fi-section-grid">
        <QuadrantScatter amcs={stats} amcIdByName={amcIdByName} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <BreadthStrip amcs={stats} />
          <ConcentrationTile amcs={stats} />
        </div>
      </div>
    </div>
  );
}
