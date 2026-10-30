import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  fetchSchemeDetail,
  fetchSchemeNavSeries,
  fetchSchemeOutlierSeries,
  fetchSchemePeerScatter,
  fetchLatestDate,
} from "../api";
import { fmtPct, fmtRatioPct, fmtCrTable, signClass } from "../format";
import SchemeTable from "../SchemeTable";
import { makeTooltipContent } from "../ChartTooltip";
import InfoTooltip from "../InfoTooltip";
import { METRIC_HELP } from "../metricHelp";
function daysAgo(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function ReturnLadder({ r }) {
  if (!r) return null;
  const windows = [
    ["1M", r.return_1m],
    ["3M", r.return_3m],
    ["6M", r.return_6m],
    ["1Y", r.return_1y],
    ["3Y", r.return_3y],
  ];
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">Trailing Returns</div>
        <div className="fi-section-subtitle">
          Regular plan NAV, point-to-point — not annualized for windows under 1Y
          except where noted
        </div>
      </div>
      <div
        className="fi-stat-strip"
        style={{
          border: "none",
          borderRadius: 0,
        }}
      >
        {windows.map(([label, val]) => (
          <div key={label} className="fi-stat-tile">
            <div className="fi-stat-label">{label}</div>
            <div className={`fi-stat-value ${signClass(val)}`}>
              {fmtPct(val, 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function SalesLadder({ m, fi }) {
  if (!m) return null;
  const windows = [
    ["1D", m.sales_1d, fi?.flow_intensity_1d],
    ["3D", m.sales_3d, fi?.flow_intensity_3d],
    ["7D", m.sales_7d, fi?.flow_intensity_7d],
    ["14D", m.sales_14d, fi?.flow_intensity_14d],
    ["30D", m.sales_30d, fi?.flow_intensity_30d],
    ["MTD", m.sales_mtd, fi?.flow_intensity_mtd],
  ];
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">Net Sales Ladder</div>
        <div className="fi-section-subtitle">
          Net sales estimate only — not gross inflow/outflow, see metric
          dictionary
        </div>
      </div>
      <table className="fi-table">
        <thead>
          <tr>
            <th>Window</th>
            <th>Sales (₹ Cr)</th>
            <th>
              Flow Intensity
              <InfoTooltip>{METRIC_HELP.flowIntensity}</InfoTooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          {windows.map(([label, sales, intensity]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className={signClass(sales)}>
                {sales !== undefined ? fmtCrTable(sales) : "—"}
              </td>
              <td className={signClass(intensity)}>{fmtRatioPct(intensity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function NavTrendChart({ series }) {
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">NAV — Last 3 Years</div>
      <div className="fi-card-subtitle">Regular plan NAV</div>
      <div
        style={{
          height: 180,
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
              dataKey="nav_date"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => d.slice(0, 7)}
              minTickGap={50}
            />
            <YAxis
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              width={55}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => v.toFixed(0)}
            />
            <Tooltip
              content={makeTooltipContent((d) => ({
                title: d.nav_date,
                rows: [
                  {
                    label: "NAV",
                    value: d.nav_value.toFixed(4),
                  },
                ],
              }))}
            />
            <Line
              type="monotone"
              dataKey="nav_value"
              stroke="var(--accent)"
              strokeWidth={1.4}
              dot={false}
            />
          </LineChart>
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
        Rolling 100-Day Outlier Band — Daily Sales
      </div>
      <div className="fi-card-subtitle">
        This scheme's own mean ± 2SD over its last 100 calendar days.
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
                    label: "Daily Sales",
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
function PeerScatterChart({ peers, schemeId }) {
  if (!peers.length) return null;
  const highlighted = peers.find((p) => p.scheme_id === Number(schemeId));
  const others = peers.filter((p) => p.scheme_id !== Number(schemeId));
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Peer Positioning</div>
      <div className="fi-card-subtitle">
        AUM vs 1D flow intensity across {peers.length} peers in the same
        subcategory — this scheme highlighted
      </div>
      <div
        style={{
          height: 240,
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
              dataKey="latest_aum"
              name="AUM"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => Math.round(v).toLocaleString("en-IN")}
            />
            <YAxis
              type="number"
              dataKey="flow_intensity_1d"
              name="Flow Int. 1D"
              tick={{
                fontSize: 10,
                fill: "var(--text-faint)",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <ZAxis range={[50, 50]} />
            <Tooltip
              cursor={{
                strokeDasharray: "3 3",
              }}
              content={makeTooltipContent((d) => ({
                title: d.scheme_name,
                subtitle:
                  d.scheme_id === Number(schemeId) ? "This scheme" : undefined,
                rows: [
                  {
                    label: "AUM",
                    value: `${Math.round(d.latest_aum).toLocaleString("en-IN")} Cr`,
                  },
                  {
                    label: "Flow Int. 1D",
                    value: fmtRatioPct(d.flow_intensity_1d),
                    className: signClass(d.flow_intensity_1d),
                  },
                  {
                    label: "Flow Int. 30D",
                    value: fmtRatioPct(d.flow_intensity_30d),
                    className: signClass(d.flow_intensity_30d),
                  },
                ],
              }))}
            />
            <Scatter data={others} fill="var(--accent)" fillOpacity={0.55} />
            {highlighted && (
              <Scatter data={[highlighted]} fill="var(--warn)" shape="star" />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default function SchemeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [navSeries, setNavSeries] = useState(null);
  const [outlierSeries, setOutlierSeries] = useState(null);
  const [scatter, setScatter] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setData(null);
    setNavSeries(null);
    setOutlierSeries(null);
    setScatter(null);
    fetchLatestDate()
      .then((d) => {
        fetchSchemeDetail(id, d)
          .then(setData)
          .catch((e) => setError(e.message));
        fetchSchemeNavSeries(id, daysAgo(d, 1095), d).then((r) =>
          setNavSeries(r.series),
        );
        fetchSchemeOutlierSeries(id, d).then((r) => setOutlierSeries(r.series));
        fetchSchemePeerScatter(id, d).then((r) => setScatter(r.peers));
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
  const { scheme, metrics, flow_intensity, returns, peers } = data;
  return (
    <>
      <div className="fi-panel fi-panel-pad">
        <div
          className="fi-section-title"
          style={{
            fontSize: 15,
          }}
        >
          {scheme.scheme_name}
        </div>
        <div className="fi-section-subtitle">
          <span
            className="fi-link"
            onClick={() =>
              navigate(`/flow-intelligence/amc/${scheme.fund_house_id}`)
            }
          >
            {scheme.fund_house}
          </span>
          {" · "}
          {scheme.category}
          {scheme.asset_class ? ` (${scheme.asset_class})` : ""}
          {" · AUM "}
          {metrics
            ? Math.round(metrics.latest_aum).toLocaleString("en-IN")
            : "—"}{" "}
          Cr
        </div>
      </div>

      <div className="fi-section-grid">
        <ReturnLadder r={returns} />
        <SalesLadder m={metrics} fi={flow_intensity} />
      </div>

      {navSeries ? (
        <NavTrendChart series={navSeries} />
      ) : (
        <div className="fi-panel fi-panel-pad fi-dim">Loading NAV chart…</div>
      )}
      {outlierSeries ? (
        <OutlierBandChart series={outlierSeries} />
      ) : (
        <div className="fi-panel fi-panel-pad fi-dim">
          Loading outlier chart…
        </div>
      )}
      {scatter ? (
        <PeerScatterChart peers={scatter} schemeId={id} />
      ) : (
        <div className="fi-panel fi-panel-pad fi-dim">
          Loading peer positioning…
        </div>
      )}

      <SchemeTable
        schemes={peers}
        title={`Peer Comparison — ${scheme.category}`}
        subtitle={`${peers.length} schemes in the same category, ranked by AUM.`}
      />
    </>
  );
}
