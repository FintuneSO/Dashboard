import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { fmtCr, fmtRatioPct, signClass } from "./format";
import { makeTooltipContent } from "./ChartTooltip";
import { fetchLatestDate } from "./api";
import InfoTooltip from "./InfoTooltip";
import { METRIC_HELP } from "./metricHelp";
const WINDOWS = ["1D", "7D", "14D", "30D", "MTD"];
function buildWaterfallData(w) {
  if (!w) return [];
  const startAum = w.latest_aum - w.aum_change;
  const afterMarket = startAum + w.market_effect;
  const endAum = w.latest_aum;
  return [
    {
      name: "Start AUM",
      base: 0,
      value: startAum,
      display: startAum,
      isTotal: true,
    },
    {
      name: "Market Effect",
      base: Math.min(startAum, afterMarket),
      value: Math.abs(w.market_effect),
      display: w.market_effect,
      isTotal: false,
      positive: w.market_effect >= 0,
    },
    {
      name: "Net Sales",
      base: Math.min(afterMarket, endAum),
      value: Math.abs(w.net_flow),
      display: w.net_flow,
      isTotal: false,
      positive: w.net_flow >= 0,
    },
    {
      name: "End AUM",
      base: 0,
      value: endAum,
      display: endAum,
      isTotal: true,
    },
  ];
}
function WaterfallChart({ windowData, windowLabel }) {
  const data = buildWaterfallData(windowData);
  if (!data.length) return null;
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.name,
    rows: [
      {
        label: d.isTotal ? "AUM" : "Change",
        value: `${d.display >= 0 && !d.isTotal ? "+" : ""}${Math.round(d.display).toLocaleString("en-IN")} Cr`,
        className: d.isTotal ? "" : signClass(d.display),
      },
    ],
  }));
  return (
    <div
      style={{
        height: 160,
        marginTop: 4,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 16,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{
              fontSize: 10,
              fill: "var(--text-faint)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{
              fontSize: 10,
              fill: "var(--text-faint)",
            }}
            axisLine={false}
            tickLine={false}
            width={55}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            content={tooltipContent}
            cursor={{
              fill: "var(--panel-sunken)",
            }}
          />
          <Bar
            dataKey="base"
            stackId="a"
            fill="transparent"
            isAnimationActive={false}
          />
          <Bar
            dataKey="value"
            stackId="a"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.isTotal
                    ? "var(--accent)"
                    : d.positive
                      ? "var(--pos)"
                      : "var(--neg)"
                }
              />
            ))}
            <LabelList
              dataKey="display"
              position="top"
              formatter={(v, entry) => {
                const isTotal = typeof entry === "object" && entry?.isTotal;
                return `${v >= 0 && !isTotal ? "+" : ""}${Math.round(v).toLocaleString("en-IN")}`;
              }}
              style={{
                fontSize: 10,
                fill: "var(--text-dim)",
                fontFamily: "var(--mono)",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export default function EntityHeader({
  name,
  aumLabel,
  entityId,
  fetchWindowSummaryFn,
}) {
  const [windowLabel, setWindowLabel] = useState("1D");
  const [windows, setWindows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setWindows(null);
    fetchLatestDate()
      .then((d) => fetchWindowSummaryFn(entityId, d))
      .then((r) => setWindows(r.windows))
      .catch((e) => setError(e.message));
  }, [entityId, fetchWindowSummaryFn]);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  const w = windows?.find((x) => x.window_label === windowLabel);
  return (
    <div className="fi-panel">
      <div
        className="fi-panel-head"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div className="fi-section-title">{name}</div>
          <div className="fi-section-subtitle">{aumLabel}</div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
          }}
        >
          {WINDOWS.map((label) => (
            <button
              key={label}
              onClick={() => setWindowLabel(label)}
              className="fi-theme-toggle"
              style={{
                width: "auto",
                padding: "0 10px",
                fontSize: 10.5,
                background:
                  windowLabel === label ? "var(--accent-bg)" : "var(--panel)",
                color:
                  windowLabel === label ? "var(--accent)" : "var(--text-dim)",
                borderColor:
                  windowLabel === label ? "var(--accent)" : "var(--border)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!windows ? (
        <div
          className="fi-panel-pad fi-dim"
          style={{
            fontSize: 12,
          }}
        >
          Loading…
        </div>
      ) : (
        <div className="fi-panel-pad">
          <div
            className="fi-stat-strip"
            style={{
              border: "none",
              borderRadius: 0,
              marginBottom: 4,
            }}
          >
            <div className="fi-stat-tile">
              <div className="fi-stat-label">AUM</div>
              <div className="fi-stat-value">{fmtCr(w.latest_aum)}</div>
            </div>
            <div className="fi-stat-tile">
              <div className="fi-stat-label">AUM Change ({windowLabel})</div>
              <div className={`fi-stat-value ${signClass(w.aum_change)}`}>
                {fmtCr(w.aum_change)}
              </div>
            </div>
            <div className="fi-stat-tile">
              <div className="fi-stat-label">
                Net Sales ({windowLabel})
                <InfoTooltip>{METRIC_HELP.netSales}</InfoTooltip>
              </div>
              <div className={`fi-stat-value ${signClass(w.net_flow)}`}>
                {fmtCr(w.net_flow)}
              </div>
            </div>
            <div className="fi-stat-tile">
              <div className="fi-stat-label">
                Market Effect ({windowLabel})
                <InfoTooltip>{METRIC_HELP.marketEffect}</InfoTooltip>
              </div>
              <div className={`fi-stat-value ${signClass(w.market_effect)}`}>
                {fmtCr(w.market_effect)}
              </div>
            </div>
          </div>
          <div
            className="fi-card-subtitle"
            style={{
              marginTop: 10,
            }}
          >
            AUM bridge — how much of the {windowLabel} change came from price
            movement (Market Effect) vs net investor sales (Net Sales)
          </div>
          <WaterfallChart windowData={w} windowLabel={windowLabel} />
        </div>
      )}
    </div>
  );
}
