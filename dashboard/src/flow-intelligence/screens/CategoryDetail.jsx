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
  ReferenceLine,
  Cell,
} from "recharts";
import {
  fetchCategoryDetail,
  fetchCategorySeries,
  fetchCategoryOutlierSeries,
  fetchLatestDate,
  fetchDirectory,
} from "../api";
import { fmtRatioPct, fmtCrTable, signClass, chartColor } from "../format";
import SchemeTable from "../SchemeTable";
import { makeTooltipContent } from "../ChartTooltip";
import InfoTooltip from "../InfoTooltip";
import { METRIC_HELP } from "../metricHelp";
function daysAgo(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function AmcSplit({ rows, amcIdByName }) {
  const navigate = useNavigate();
  const total = rows.reduce((s, r) => s + Number(r.aum || 0), 0);
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">AMC Leaderboard — This Category</div>
        <div className="fi-section-subtitle">
          Which AMCs dominate this category, by AUM and by flow (often diverge)
        </div>
      </div>
      <table className="fi-table">
        <thead>
          <tr>
            <th className="fi-row-idx">#</th>
            <th>AMC</th>
            <th>AUM (₹ Cr)</th>
            <th>% of Category</th>
            <th>Sales 1D</th>
            <th>Sales 30D</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.fund_house}
              className="fi-link"
              onClick={() =>
                amcIdByName[r.fund_house] &&
                navigate(`/flow-intelligence/amc/${amcIdByName[r.fund_house]}`)
              }
            >
              <td className="fi-row-idx">{i + 1}</td>
              <td>{r.fund_house}</td>
              <td>{fmtCrTable(r.aum)}</td>
              <td className="fi-dim">{((r.aum / total) * 100).toFixed(1)}%</td>
              <td className={signClass(r.sales_1d)}>
                {fmtCrTable(r.sales_1d)}
              </td>
              <td className={signClass(r.sales_30d)}>
                {fmtCrTable(r.sales_30d)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function AmcShareChart({ rows, amcIdByName }) {
  const navigate = useNavigate();
  const total = rows.reduce((s, r) => s + Number(r.aum || 0), 0);
  const top8 = [...rows].sort((a, b) => b.aum - a.aum).slice(0, 8);
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.fund_house,
    rows: [
      {
        label: "AUM",
        value: `${Math.round(d.aum).toLocaleString("en-IN")} Cr`,
      },
      {
        label: "Share of Category",
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
      <div className="fi-card-title">AMC Market Share</div>
      <div className="fi-card-subtitle">
        Top 8 AMCs by AUM within this category
      </div>
      <div
        style={{
          height: Math.max(140, top8.length * 30),
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={top8}
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
              dataKey="fund_house"
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
                    amcIdByName[payload.value] &&
                    navigate(
                      `/flow-intelligence/amc/${amcIdByName[payload.value]}`,
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
              {top8.map((_, i) => (
                <Cell key={i} fill={chartColor(i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function AumTrendChart({ series }) {
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">AUM — Last 6 Months</div>
      <div className="fi-card-subtitle">
        Daily total AUM across this category's active schemes
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
                    value: `${Math.round(d.total_aum).toLocaleString("en-IN")} Cr`,
                  },
                  {
                    label: "Net Sales 1D",
                    value:
                      d.net_flow_1d != null
                        ? `${Math.round(d.net_flow_1d).toLocaleString("en-IN")} Cr`
                        : "—",
                    className: signClass(d.net_flow_1d),
                  },
                ],
              }))}
            />
            <Line
              type="monotone"
              dataKey="total_aum"
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
function OutlierBandChart({ series }) {
  if (!series.length) return null;
  const bounds = series[0];
  const outlierCount = series.filter((d) => d.is_outlier).length;
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">
        Rolling 100-Day Outlier Band — Category Net Sales
      </div>
      <div className="fi-card-subtitle">
        This category's own mean ± 2SD over its last 100 calendar days.
        {outlierCount > 0
          ? ` ${outlierCount} day${outlierCount > 1 ? "s" : ""} breached the band.`
          : " No breaches in this window."}
      </div>
      <div
        style={{
          height: 200,
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
                subtitle: d.is_outlier
                  ? "Breached the 100-day band"
                  : "Within normal range",
                rows: [
                  {
                    label: "Net Sales",
                    value: `${Math.round(d.daily_sales).toLocaleString("en-IN")} Cr`,
                    className: d.is_outlier
                      ? "fi-neg"
                      : signClass(d.daily_sales),
                  },
                  {
                    label: "100D Mean",
                    value: `${Math.round(d.mean_daily_sales).toLocaleString("en-IN")} Cr`,
                  },
                  {
                    label: "Upper Band (+2SD)",
                    value: `${Math.round(d.mean_plus_2sd_sales).toLocaleString("en-IN")} Cr`,
                  },
                  {
                    label: "Lower Band (-2SD)",
                    value: `${Math.round(d.mean_minus_2sd_sales).toLocaleString("en-IN")} Cr`,
                  },
                ],
              }))}
            />
            <ReferenceLine
              y={bounds.mean_plus_2sd_sales}
              stroke="var(--neg)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              y={bounds.mean_minus_2sd_sales}
              stroke="var(--neg)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              y={bounds.mean_daily_sales}
              stroke="var(--text-faint)"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
            <Line
              type="monotone"
              dataKey="daily_sales"
              stroke="var(--accent)"
              strokeWidth={1.4}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload.is_outlier) return null;
                return (
                  <circle
                    key={payload.as_of_date}
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill="var(--neg)"
                    stroke="var(--bg)"
                    strokeWidth={1}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default function CategoryDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [dir, setDir] = useState(null);
  const [series, setSeries] = useState(null);
  const [outlierSeries, setOutlierSeries] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setData(null);
    setSeries(null);
    setOutlierSeries(null);
    fetchLatestDate()
      .then((d) => {
        Promise.all([fetchCategoryDetail(id, d), fetchDirectory()])
          .then(([res, directory]) => {
            setData(res);
            setDir(directory);
          })
          .catch((e) => setError(e.message));
        fetchCategorySeries(id, daysAgo(d, 182), d).then((r) =>
          setSeries(r.series),
        );
        fetchCategoryOutlierSeries(id, d).then((r) =>
          setOutlierSeries(r.series),
        );
      })
      .catch((e) => setError(e.message));
  }, [id]);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!data || !dir)
    return <div className="fi-panel fi-panel-pad fi-dim">Loading…</div>;
  const amcIdByName = Object.fromEntries(
    dir.amcs.map((a) => [a.name, a.fund_house_id]),
  );
  const s = data.summary;
  return (
    <>
      <div className="fi-stat-strip">
        <div className="fi-stat-tile">
          <div className="fi-stat-label">{data.name}</div>
          <div className="fi-stat-value">
            {s ? Math.round(s.latest_aum).toLocaleString("en-IN") : "—"} Cr
          </div>
        </div>
        <div className="fi-stat-tile">
          <div className="fi-stat-label">
            Flow Intensity 1D
            <InfoTooltip>{METRIC_HELP.flowIntensity}</InfoTooltip>
          </div>
          <div className={`fi-stat-value ${signClass(s?.flow_intensity_1d)}`}>
            {fmtRatioPct(s?.flow_intensity_1d)}
          </div>
        </div>
        <div className="fi-stat-tile">
          <div className="fi-stat-label">Flow Intensity 7D</div>
          <div className={`fi-stat-value ${signClass(s?.flow_intensity_7d)}`}>
            {fmtRatioPct(s?.flow_intensity_7d)}
          </div>
        </div>
        <div className="fi-stat-tile">
          <div className="fi-stat-label">Flow Intensity 30D</div>
          <div className={`fi-stat-value ${signClass(s?.flow_intensity_30d)}`}>
            {fmtRatioPct(s?.flow_intensity_30d)}
          </div>
        </div>
        <div className="fi-stat-tile">
          <div className="fi-stat-label">Flow Intensity MTD</div>
          <div className={`fi-stat-value ${signClass(s?.flow_intensity_mtd)}`}>
            {fmtRatioPct(s?.flow_intensity_mtd)}
          </div>
        </div>
      </div>

      {series ? (
        <div className="fi-section-grid">
          <AumTrendChart series={series} />
          <NetFlowChart series={series} />
        </div>
      ) : (
        <div className="fi-panel fi-panel-pad fi-dim">
          Loading trend charts…
        </div>
      )}

      <div className="fi-section-grid">
        <AmcShareChart rows={data.amc_split} amcIdByName={amcIdByName} />
        {outlierSeries ? (
          <OutlierBandChart series={outlierSeries} />
        ) : (
          <div className="fi-panel fi-panel-pad fi-dim">
            Loading outlier chart…
          </div>
        )}
      </div>

      <AmcSplit rows={data.amc_split} amcIdByName={amcIdByName} />
      <SchemeTable
        schemes={data.schemes}
        title={`Schemes (${data.schemes.length})`}
        subtitle={`All ${data.name} schemes across every AMC, ranked by AUM`}
      />
    </>
  );
}
