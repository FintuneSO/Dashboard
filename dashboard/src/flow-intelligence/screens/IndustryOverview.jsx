import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Brush,
} from "recharts";
import {
  fetchIndustry,
  fetchIndustrySummary,
  fetchIndustrySeries,
  fetchLatestDate,
  fetchDirectory,
  fetchDirectRegularGap,
} from "../api";
import { fmtCr, fmtCrTable, fmtRatioPct, signClass, median } from "../format";
import { useSort, sortRows, SortTh } from "../DataTable";
import InfoTooltip from "../InfoTooltip";
import { METRIC_HELP } from "../metricHelp";
import CategoryTreemap from "../CategoryTreemap";
import AmcSharePanel from "../AmcSharePanel";
import { makeTooltipContent } from "../ChartTooltip";
function AmcLeaderboard({ amcs, amcIdByName }) {
  const sort = useSort("latest_aum");
  const navigate = useNavigate();
  const rows = sortRows(amcs, sort.key, sort.dir);
  const medFI1d = median(amcs.map((a) => a.flow_intensity_1d));
  const medFI30d = median(amcs.map((a) => a.flow_intensity_30d));
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">AMC Leaderboard</div>
        <div className="fi-section-subtitle">
          Flow intensity = net flow ÷ opening AUM — normalized for size, not
          absolute ₹ Cr
        </div>
      </div>
      <table className="fi-table">
        <thead>
          <tr>
            <th className="fi-row-idx">#</th>
            <th>AMC</th>
            <SortTh label="AUM (₹ Cr)" sortKey="latest_aum" sort={sort} />
            <SortTh
              label={
                <>
                  Flow Int. 1D
                  <InfoTooltip>{METRIC_HELP.flowIntensity}</InfoTooltip>
                </>
              }
              sortKey="flow_intensity_1d"
              sort={sort}
            />
            <SortTh
              label="Flow Int. 7D"
              sortKey="flow_intensity_7d"
              sort={sort}
            />
            <SortTh
              label="Flow Int. 30D"
              sortKey="flow_intensity_30d"
              sort={sort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr
              key={a.fund_house_name}
              className="fi-link"
              onClick={() =>
                amcIdByName[a.fund_house_name] &&
                navigate(
                  `/flow-intelligence/amc/${amcIdByName[a.fund_house_name]}`,
                )
              }
            >
              <td className="fi-row-idx">{i + 1}</td>
              <td>{a.fund_house_name}</td>
              <td>{fmtCrTable(a.latest_aum)}</td>
              <td className={signClass(a.flow_intensity_1d)}>
                {fmtRatioPct(a.flow_intensity_1d)}
              </td>
              <td className={signClass(a.flow_intensity_7d)}>
                {fmtRatioPct(a.flow_intensity_7d)}
              </td>
              <td className={signClass(a.flow_intensity_30d)}>
                {fmtRatioPct(a.flow_intensity_30d)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Median</td>
            <td className={signClass(medFI1d)}>{fmtRatioPct(medFI1d)}</td>
            <td></td>
            <td className={signClass(medFI30d)}>{fmtRatioPct(medFI30d)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
function CategoryRotationTable({ categories, categoryIdByName }) {
  const sort = useSort("flow_intensity_1d");
  const navigate = useNavigate();
  const rows = sortRows(categories, sort.key, sort.dir);
  const medFI1d = median(categories.map((c) => c.flow_intensity_1d));
  const medFI30d = median(categories.map((c) => c.flow_intensity_30d));
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">Category Rotation</div>
        <div className="fi-section-subtitle">
          Ranked by net-flow intensity (% of opening AUM), 1D vs 30D
        </div>
      </div>
      <table className="fi-table">
        <thead>
          <tr>
            <th className="fi-row-idx">#</th>
            <th>Category</th>
            <SortTh label="AUM (₹ Cr)" sortKey="latest_aum" sort={sort} />
            <SortTh
              label={
                <>
                  Flow Int. 1D
                  <InfoTooltip>{METRIC_HELP.flowIntensity}</InfoTooltip>
                </>
              }
              sortKey="flow_intensity_1d"
              sort={sort}
            />
            <SortTh
              label="Flow Int. 7D"
              sortKey="flow_intensity_7d"
              sort={sort}
            />
            <SortTh
              label="Flow Int. 30D"
              sortKey="flow_intensity_30d"
              sort={sort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr
              key={c.category}
              className="fi-link"
              onClick={() =>
                categoryIdByName[c.category] &&
                navigate(
                  `/flow-intelligence/category/${categoryIdByName[c.category]}`,
                )
              }
            >
              <td className="fi-row-idx">{i + 1}</td>
              <td>{c.category}</td>
              <td>{fmtCrTable(c.latest_aum)}</td>
              <td className={signClass(c.flow_intensity_1d)}>
                {fmtRatioPct(c.flow_intensity_1d)}
              </td>
              <td className={signClass(c.flow_intensity_7d)}>
                {fmtRatioPct(c.flow_intensity_7d)}
              </td>
              <td className={signClass(c.flow_intensity_30d)}>
                {fmtRatioPct(c.flow_intensity_30d)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Median</td>
            <td className={signClass(medFI1d)}>{fmtRatioPct(medFI1d)}</td>
            <td></td>
            <td className={signClass(medFI30d)}>{fmtRatioPct(medFI30d)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
function StatStrip({ summary }) {
  const s = summary.summary;
  const conc = summary.concentration;
  const states = summary.rotation_states || {};
  const stateSummary = [
    "accelerating",
    "steady",
    "rotating-in",
    "rotating-out",
    "deteriorating",
  ]
    .filter((k) => states[k])
    .map((k) => `${states[k]} ${k}`)
    .join(" · ");
  return (
    <div className="fi-stat-strip">
      <div className="fi-stat-tile">
        <div className="fi-stat-label">Total Industry AUM (₹ Cr)</div>
        <div className="fi-stat-value">{fmtCr(s?.total_aum)}</div>
        <div
          className={`fi-num ${signClass(s?.aum_change_1d)}`}
          style={{
            fontSize: 11,
            marginTop: 2,
          }}
        >
          {fmtCr(s?.aum_change_1d)} 1D
        </div>
      </div>
      <div className="fi-stat-tile">
        <div className="fi-stat-label">Industry Net Sales 1D (₹ Cr)</div>
        <div className={`fi-stat-value ${signClass(s?.net_flow_1d)}`}>
          {fmtCr(s?.net_flow_1d)}
        </div>
      </div>
      <div className="fi-stat-tile">
        <div className="fi-stat-label">Industry Net Sales MTD (₹ Cr)</div>
        <div className={`fi-stat-value ${signClass(s?.net_flow_mtd)}`}>
          {fmtCr(s?.net_flow_mtd)}
        </div>
      </div>
      <div className="fi-stat-tile">
        <div className="fi-stat-label">Top 5 AMC Concentration</div>
        <div className="fi-stat-value">
          {conc ? `${conc.top_n_share.toFixed(1)}%` : "—"}
        </div>
      </div>
      <div className="fi-stat-tile">
        <div className="fi-stat-label">Category Rotation (1D vs 30D)</div>
        <div
          className="fi-stat-value"
          style={{
            fontSize: 12.5,
            lineHeight: 1.4,
          }}
        >
          {stateSummary || "—"}
        </div>
      </div>
      <div className="fi-stat-tile">
        <div className="fi-stat-label">Gross Inflow / Outflow</div>
        <div
          className="fi-stat-value fi-faint"
          style={{
            fontSize: 12,
          }}
        >
          Not available — net flow only
        </div>
      </div>
    </div>
  );
}
function AssetClassFlowStrip({ rows }) {
  const navigate = useNavigate();
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">Where Is Money Going Today</div>
        <div className="fi-section-subtitle">
          Net flow 1D by asset class — not a forecast, today's estimate only
        </div>
      </div>
      <table className="fi-table">
        <thead>
          <tr>
            <th>Asset Class</th>
            <th>AUM (₹ Cr)</th>
            <th>Net Sales 1D</th>
            <th>Net Sales MTD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.asset_class}
              className="fi-link"
              onClick={() =>
                navigate(
                  `/flow-intelligence/asset-class/${encodeURIComponent(r.asset_class)}`,
                )
              }
            >
              <td>{r.asset_class}</td>
              <td>{fmtCrTable(r.latest_aum)}</td>
              <td className={signClass(r.net_flow_1d)}>
                {fmtCr(r.net_flow_1d)}
              </td>
              <td className={signClass(r.net_flow_mtd)}>
                {fmtCr(r.net_flow_mtd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function DirectRegularGap({ data }) {
  const navigate = useNavigate();
  if (!data?.summary) return null;
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">
          Direct vs Regular Plan — Return Gap
        </div>
        <div className="fi-section-subtitle">
          1Y return differential (expense-ratio drag),{" "}
          {data.summary.scheme_count} schemes with both plans. AUM can't be
          split by plan (AMFI reports it scheme-level only) — this is NAV-based,
          not a flow metric.
        </div>
      </div>
      <div
        className="fi-stat-strip"
        style={{
          border: "none",
          borderRadius: 0,
          gridTemplateColumns: "220px 1fr",
        }}
      >
        <div className="fi-stat-tile">
          <div className="fi-stat-label">Industry Avg Gap (1Y)</div>
          <div
            className={`fi-stat-value ${signClass(data.summary.avg_return_gap_1y)}`}
          >
            {fmtRatioPctPts(data.summary.avg_return_gap_1y)}
          </div>
        </div>
        <div />
      </div>
      <table className="fi-table">
        <thead>
          <tr>
            <th className="fi-row-idx">#</th>
            <th>Scheme</th>
            <th>Category</th>
            <th>Direct 1Y</th>
            <th>Regular 1Y</th>
            <th>Gap</th>
          </tr>
        </thead>
        <tbody>
          {data.top_schemes.map((s, i) => (
            <tr
              key={s.scheme_id}
              className="fi-link"
              onClick={() =>
                navigate(`/flow-intelligence/scheme/${s.scheme_id}`)
              }
            >
              <td className="fi-row-idx">{i + 1}</td>
              <td>{s.scheme_name}</td>
              <td className="fi-dim">{s.category}</td>
              <td className={signClass(s.return_1y_direct)}>
                {fmtRatioPctPts(s.return_1y_direct)}
              </td>
              <td className={signClass(s.return_1y_regular)}>
                {fmtRatioPctPts(s.return_1y_regular)}
              </td>
              <td className={signClass(s.return_gap_1y)}>
                {fmtRatioPctPts(s.return_gap_1y)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function fmtRatioPctPts(n) {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)} pts`;
}
const ZOOM_PRESETS = [
  {
    label: "1M",
    days: 30,
  },
  {
    label: "6M",
    days: 182,
  },
  {
    label: "1Y",
    days: 365,
  },
  {
    label: "3Y",
    days: 1095,
  },
  {
    label: "All",
    days: null,
  },
];
function ZoomPresetButtons({ zoomDays, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
      }}
    >
      {ZOOM_PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => onChange(p.days)}
          className="fi-theme-toggle"
          style={{
            width: "auto",
            padding: "0 8px",
            fontSize: 10.5,
            background:
              zoomDays === p.days ? "var(--accent-bg)" : "var(--panel)",
            color: zoomDays === p.days ? "var(--accent)" : "var(--text-dim)",
            borderColor:
              zoomDays === p.days ? "var(--accent)" : "var(--border)",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
function AumTrendChart({ series }) {
  const [zoomDays, setZoomDays] = useState(182);
  const windowed = zoomDays ? series.slice(-zoomDays) : series;
  return (
    <div className="fi-panel fi-panel-pad">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div className="fi-card-title">Industry AUM</div>
          <div className="fi-card-subtitle">
            Daily total AUM across all active open-ended schemes — drag the band
            below to zoom into any range
          </div>
        </div>
        <ZoomPresetButtons zoomDays={zoomDays} onChange={setZoomDays} />
      </div>
      <div
        style={{
          height: 220,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={windowed}>
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
              width={60}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${Math.round(v / 100000)}L`}
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
              isAnimationActive={false}
            />
            <Brush
              dataKey="as_of_date"
              height={24}
              stroke="var(--accent)"
              fill="var(--panel-sunken)"
              tickFormatter={(i) => windowed[i]?.as_of_date?.slice(0, 7) ?? ""}
              travellerWidth={8}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function NetFlowTrendChart({ series }) {
  const [zoomDays, setZoomDays] = useState(30);
  const windowed = zoomDays ? series.slice(-zoomDays) : series;
  return (
    <div className="fi-panel fi-panel-pad">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div className="fi-card-title">Industry Net Sales</div>
          <div className="fi-card-subtitle">
            Daily net flow estimate (signed), ₹ Cr — not gross inflow/outflow,
            see metric dictionary. Drag the band below to zoom.
          </div>
        </div>
        <ZoomPresetButtons zoomDays={zoomDays} onChange={setZoomDays} />
      </div>
      <div
        style={{
          height: 220,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={windowed}>
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
              tickFormatter={(d) => d.slice(0, 7)}
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
                  {
                    label: "Total AUM",
                    value: `${Math.round(d.total_aum).toLocaleString("en-IN")} Cr`,
                  },
                ],
              }))}
            />
            <Bar dataKey="net_flow_1d" isAnimationActive={false}>
              {windowed.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.net_flow_1d >= 0 ? "var(--pos)" : "var(--neg)"}
                />
              ))}
            </Bar>
            <Brush
              dataKey="as_of_date"
              height={24}
              stroke="var(--accent)"
              fill="var(--panel-sunken)"
              tickFormatter={(i) => windowed[i]?.as_of_date?.slice(0, 7) ?? ""}
              travellerWidth={8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function daysAgo(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
export default function IndustryOverview() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dir, setDir] = useState(null);
  const [series, setSeries] = useState(null);
  const [drGap, setDrGap] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchLatestDate()
      .then((d) => {
        Promise.all([
          fetchIndustry(d),
          fetchIndustrySummary(d),
          fetchDirectory(),
        ])
          .then(([industry, summaryRes, directory]) => {
            setData(industry);
            setSummary(summaryRes);
            setDir(directory);
          })
          .catch((e) => setError(e.message));
        fetchIndustrySeries("2022-03-31", d).then((r) => setSeries(r.series));
        fetchDirectRegularGap(d).then(setDrGap);
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!data || !summary || !dir)
    return <div className="fi-panel fi-panel-pad fi-dim">Loading…</div>;
  const amcIdByName = Object.fromEntries(
    dir.amcs.map((a) => [a.name, a.fund_house_id]),
  );
  const categoryIdByName = Object.fromEntries(
    dir.categories.map((c) => [c.name, c.subcategory_id]),
  );
  return (
    <>
      <StatStrip summary={summary} />
      <AmcSharePanel
        categories={data.categories}
        categoryIdByName={categoryIdByName}
        amcIdByName={amcIdByName}
      />
      <CategoryTreemap
        categories={data.categories}
        categoryIdByName={categoryIdByName}
      />
      {series ? (
        <>
          <AumTrendChart series={series} />
          <NetFlowTrendChart series={series} />
        </>
      ) : (
        <div className="fi-panel fi-panel-pad fi-dim">
          Loading trend charts…
        </div>
      )}
      <AssetClassFlowStrip rows={summary.asset_class_flow} />
      <div className="fi-section-grid">
        <CategoryRotationTable
          categories={data.categories}
          categoryIdByName={categoryIdByName}
        />
        <AmcLeaderboard amcs={data.amcs} amcIdByName={amcIdByName} />
      </div>
      {drGap ? (
        <DirectRegularGap data={drGap} />
      ) : (
        <div className="fi-panel fi-panel-pad fi-dim">
          Loading direct/regular gap…
        </div>
      )}
    </>
  );
}
