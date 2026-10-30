import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  fetchAmcDetail,
  fetchAmcSeries,
  fetchAmcWindowSummary,
  fetchLatestDate,
} from "../api";
import { fmtRatioPct, fmtPct, signClass, chartColor } from "../format";
import SchemeTable from "../SchemeTable";
import { makeTooltipContent } from "../ChartTooltip";
import EntityHeader from "../EntityHeader";
import LollipopChart from "../LollipopChart";
import InfoTooltip from "../InfoTooltip";
import { METRIC_HELP } from "../metricHelp";
function daysAgo(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function CategorySplitChart({ rows }) {
  const navigate = useNavigate();
  const total = rows.reduce((s, r) => s + Number(r.aum || 0), 0);
  const data = [...rows].sort((a, b) => b.aum - a.aum);
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.category,
    rows: [
      {
        label: "AUM",
        value: `${Math.round(d.aum).toLocaleString("en-IN")} Cr`,
      },
      {
        label: "Share of AMC",
        value: `${((d.aum / total) * 100).toFixed(1)}%`,
      },
      {
        label: "Sales 1D",
        value: `${Math.round(d.sales_1d).toLocaleString("en-IN")} Cr`,
        className: signClass(d.sales_1d),
      },
      {
        label: "Sales 30D",
        value: `${Math.round(d.sales_30d).toLocaleString("en-IN")} Cr`,
        className: signClass(d.sales_30d),
      },
    ],
  }));
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Category Split</div>
      <div className="fi-card-subtitle">This AMC's AUM by category</div>
      <div
        style={{
          height: Math.max(140, data.length * 32),
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              left: 8,
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
              tickFormatter={(v) => Math.round(v).toLocaleString("en-IN")}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={110}
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--accent)"
                  style={{
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() =>
                    navigate(
                      `/flow-intelligence/asset-class/${encodeURIComponent(payload.value)}`,
                    )
                  }
                >
                  {payload.value}
                </text>
              )}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{
                fill: "var(--panel-sunken)",
              }}
            />
            <Bar dataKey="aum" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={chartColor(i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
const TOP_SCHEMES_METRICS = [
  {
    key: "latest_aum",
    label: "AUM",
    signed: false,
    format: (v) => `${Math.round(v).toLocaleString("en-IN")} Cr`,
  },
  {
    key: "sales_1d",
    label: "Net Sales 1D",
    signed: true,
    format: (v) => `${Math.round(v).toLocaleString("en-IN")} Cr`,
  },
  {
    key: "sales_30d",
    label: "Net Sales 30D",
    signed: true,
    format: (v) => `${Math.round(v).toLocaleString("en-IN")} Cr`,
  },
  {
    key: "flow_intensity_1d",
    label: "Flow Intensity 1D",
    signed: true,
    format: (v) => fmtRatioPct(v),
  },
  {
    key: "flow_intensity_30d",
    label: "Flow Intensity 30D",
    signed: true,
    format: (v) => fmtRatioPct(v),
  },
  {
    key: "return_1y",
    label: "1Y Return",
    signed: true,
    format: (v) => fmtPct(v, 1),
  },
  {
    key: "return_3y",
    label: "3Y Return",
    signed: true,
    format: (v) => fmtPct(v, 1),
  },
];
function TopSchemesChart({ schemes }) {
  const navigate = useNavigate();
  const schemeIdByName = Object.fromEntries(
    schemes.map((s) => [s.scheme_name, s.scheme_id]),
  );
  const [metricKey, setMetricKey] = useState("latest_aum");
  const metric = TOP_SCHEMES_METRICS.find((m) => m.key === metricKey);
  const ranked = [...schemes]
    .filter((s) => s[metric.key] !== null && s[metric.key] !== undefined)
    .sort((a, b) => b[metric.key] - a[metric.key]);
  const data = metric.signed
    ? [...ranked.slice(0, 5), ...ranked.slice(-5).reverse()].filter(
        (d, i, arr) => arr.findIndex((x) => x.scheme_id === d.scheme_id) === i,
      )
    : ranked.slice(0, 8);
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.scheme_name,
    subtitle: metric.signed
      ? d[metric.key] >= 0
        ? `Highest ${metric.label.toLowerCase()}`
        : `Lowest ${metric.label.toLowerCase()}`
      : undefined,
    rows: [
      {
        label: metric.label,
        value: metric.format(d[metric.key]),
        className: metric.signed ? signClass(d[metric.key]) : "",
      },
      {
        label: "AUM",
        value: `${Math.round(d.latest_aum).toLocaleString("en-IN")} Cr`,
      },
      {
        label: "1Y Return",
        value: fmtPct(d.return_1y, 1),
        className: signClass(d.return_1y),
      },
    ],
  }));
  return (
    <div className="fi-panel fi-panel-pad">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="fi-card-title">Best Schemes — by {metric.label}</div>
          <div className="fi-card-subtitle">
            "Best" depends on what you're optimizing for — switch the metric to
            see a different ranking of this AMC's own schemes
          </div>
        </div>
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
          style={{
            background: "var(--panel-sunken)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 8px",
            fontSize: 11,
            fontFamily: "var(--sans)",
          }}
        >
          {TOP_SCHEMES_METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          marginTop: 10,
        }}
      >
        {metric.signed ? (
          <LollipopChart
            data={data}
            dataKey={metric.key}
            nameKey="scheme_name"
            tooltipContent={tooltipContent}
            xTickFormatter={(v) =>
              metric.key.includes("flow_intensity")
                ? `${(v * 100).toFixed(1)}%`
                : Math.round(v).toLocaleString("en-IN")
            }
            onNameClick={(name) =>
              schemeIdByName[name] &&
              navigate(`/flow-intelligence/scheme/${schemeIdByName[name]}`)
            }
          />
        ) : (
          <div
            style={{
              height: Math.max(180, data.length * 28),
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{
                  left: 8,
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
                  tickFormatter={(v) => Math.round(v).toLocaleString("en-IN")}
                />
                <YAxis
                  type="category"
                  dataKey="scheme_name"
                  width={160}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tick={({ x, y, payload }) => (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="end"
                      fontSize={10.5}
                      fill="var(--accent)"
                      style={{
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      onClick={() =>
                        schemeIdByName[payload.value] &&
                        navigate(
                          `/flow-intelligence/scheme/${schemeIdByName[payload.value]}`,
                        )
                      }
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <Tooltip
                  content={tooltipContent}
                  cursor={{
                    fill: "var(--panel-sunken)",
                  }}
                />
                <Bar dataKey={metric.key} radius={[0, 4, 4, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={chartColor(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
function AumTrendChart({ series }) {
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">AUM — Last 6 Months</div>
      <div className="fi-card-subtitle">
        Daily total AUM across this AMC's active schemes
      </div>
      <div
        style={{
          height: 160,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="as_of_date"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => d.slice(5)}
              minTickGap={40}
            />
            <YAxis
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              width={55}
              tickFormatter={(v) => Math.round(v).toLocaleString("en-IN")}
            />
            <Tooltip
              content={makeTooltipContent((d) => ({
                title: d.as_of_date,
                rows: [
                  {
                    label: "AUM",
                    value: `${Math.round(d.amc_aum).toLocaleString("en-IN")} Cr`,
                  },
                  {
                    label: "Net Sales 1D",
                    value:
                      d.net_flow_1d != null
                        ? `${Math.round(d.net_flow_1d).toLocaleString("en-IN")} Cr`
                        : "—",
                    className: signClass(d.net_flow_1d),
                  },
                  {
                    label: "Market Share",
                    value:
                      d.market_share != null
                        ? `${d.market_share.toFixed(2)}%`
                        : "—",
                  },
                ],
              }))}
            />
            <Line
              type="monotone"
              dataKey="amc_aum"
              stroke="var(--accent)"
              strokeWidth={1.6}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function NetFlowChart({ series }) {
  const recent = series.slice(-30);
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Net Sales — Last 30 Days</div>
      <div className="fi-card-subtitle">
        Daily net flow estimate (signed), ₹ Cr
      </div>
      <div
        style={{
          height: 160,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={recent}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="as_of_date"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => d.slice(5)}
              minTickGap={30}
            />
            <YAxis
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v) => Math.round(v).toLocaleString("en-IN")}
            />
            <Tooltip
              cursor={{
                fill: "var(--panel-sunken)",
              }}
              content={makeTooltipContent((d) => ({
                title: d.as_of_date,
                subtitle:
                  d.net_flow_1d >= 0 ? "Net inflow day" : "Net outflow day",
                rows: [
                  {
                    label: "Net Sales 1D",
                    value: `${Math.round(d.net_flow_1d).toLocaleString("en-IN")} Cr`,
                    className: signClass(d.net_flow_1d),
                  },
                ],
              }))}
            />
            <Bar dataKey="net_flow_1d">
              {recent.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.net_flow_1d >= 0 ? "var(--pos)" : "var(--neg)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function FlowIntensityOverlayChart({ series, amcName }) {
  const recent = series
    .slice(-60)
    .filter((d) => d.amc_flow_intensity_1d !== null);
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">
        Flow Intensity vs Industry — Last 60 Days
        <InfoTooltip>{METRIC_HELP.flowIntensity}</InfoTooltip>
      </div>
      <div className="fi-card-subtitle">
        {amcName}'s daily flow intensity (blue) vs industry-wide flow intensity
        (grey), both % of opening AUM
      </div>
      <div
        style={{
          height: 180,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={recent}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="as_of_date"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => d.slice(5)}
              minTickGap={40}
            />
            <YAxis
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <Tooltip
              content={makeTooltipContent((d) => ({
                title: d.as_of_date,
                rows: [
                  {
                    label: amcName,
                    value: fmtRatioPct(d.amc_flow_intensity_1d),
                    className: signClass(d.amc_flow_intensity_1d),
                  },
                  {
                    label: "Industry",
                    value: fmtRatioPct(d.industry_flow_intensity_1d),
                    className: signClass(d.industry_flow_intensity_1d),
                  },
                ],
              }))}
            />
            <Line
              type="monotone"
              dataKey="industry_flow_intensity_1d"
              stroke="var(--text-faint)"
              strokeWidth={1.2}
              dot={false}
              name="Industry"
            />
            <Line
              type="monotone"
              dataKey="amc_flow_intensity_1d"
              stroke="var(--accent)"
              strokeWidth={1.6}
              dot={false}
              name={amcName}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function MarketShareChart({ series }) {
  const last = series[series.length - 1];
  const first = series[0];
  const change = last && first ? last.market_share - first.market_share : null;
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Market Share — Last 6 Months</div>
      <div className="fi-card-subtitle">
        % of industry AUM this AMC holds
        {change !== null && (
          <>
            {" "}
            —{" "}
            <span className={signClass(change)}>
              {change > 0 ? "+" : ""}
              {change.toFixed(2)} pts over period
            </span>
          </>
        )}
      </div>
      <div
        style={{
          height: 160,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="as_of_date"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => d.slice(5)}
              minTickGap={40}
            />
            <YAxis
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              width={45}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
              domain={["dataMin - 0.3", "dataMax + 0.3"]}
            />
            <Tooltip
              content={makeTooltipContent((d) => ({
                title: d.as_of_date,
                rows: [
                  {
                    label: "Market Share",
                    value: `${d.market_share.toFixed(2)}%`,
                  },
                  {
                    label: "AUM",
                    value: `${Math.round(d.amc_aum).toLocaleString("en-IN")} Cr`,
                  },
                  {
                    label: "Industry AUM",
                    value: `${Math.round(d.industry_aum).toLocaleString("en-IN")} Cr`,
                  },
                ],
              }))}
            />
            <Line
              type="monotone"
              dataKey="market_share"
              stroke="var(--warn)"
              strokeWidth={1.6}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default function AmcDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [series, setSeries] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setData(null);
    setSeries(null);
    fetchLatestDate()
      .then((d) => {
        fetchAmcDetail(id, d)
          .then(setData)
          .catch((e) => setError(e.message));
        fetchAmcSeries(id, daysAgo(d, 182), d).then((r) => setSeries(r.series));
      })
      .catch((e) => setError(e.message));
  }, [id]);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!data)
    return <div className="fi-panel fi-panel-pad fi-dim">Loading…</div>;
  return (
    <>
      <EntityHeader
        name={data.name}
        aumLabel="Asset Management Company"
        entityId={id}
        fetchWindowSummaryFn={fetchAmcWindowSummary}
      />

      {series ? (
        <>
          <div className="fi-section-grid">
            <AumTrendChart series={series} />
            <NetFlowChart series={series} />
          </div>
          <div className="fi-section-grid">
            <MarketShareChart series={series} />
            <CategorySplitChart rows={data.category_split} />
          </div>
          <FlowIntensityOverlayChart series={series} amcName={data.name} />
        </>
      ) : (
        <>
          <div className="fi-panel fi-panel-pad fi-dim">
            Loading trend charts…
          </div>
          <CategorySplitChart rows={data.category_split} />
        </>
      )}

      <TopSchemesChart schemes={data.schemes} />

      <SchemeTable
        schemes={data.schemes}
        title={`Schemes (${data.schemes.length})`}
        subtitle={`All schemes managed by ${data.name}, ranked by AUM`}
      />
    </>
  );
}
