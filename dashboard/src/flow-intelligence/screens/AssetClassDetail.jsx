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
  fetchAssetClassDetail,
  fetchAssetClassSeries,
  fetchLatestDate,
  fetchDirectory,
} from "../api";
import { fmtCr, fmtCrTable, fmtRatioPct, signClass, median } from "../format";
import { useSort, sortRows, SortTh } from "../DataTable";
import InfoTooltip from "../InfoTooltip";
import { METRIC_HELP } from "../metricHelp";
import CategoryTreemap from "../CategoryTreemap";
import { makeTooltipContent } from "../ChartTooltip";
function daysAgo(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function AumTrendChart({ series }) {
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">AUM — Last 6 Months</div>
      <div className="fi-card-subtitle">
        Daily total AUM across this asset class's active schemes
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
              width={60}
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
function SubcategoryTable({ rows, categoryIdByName }) {
  const sort = useSort("latest_aum");
  const navigate = useNavigate();
  const sorted = sortRows(rows, sort.key, sort.dir);
  const med1d = median(rows.map((r) => r.flow_intensity_1d));
  const med30d = median(rows.map((r) => r.flow_intensity_30d));
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">Subcategories</div>
        <div className="fi-section-subtitle">
          {rows.length} subcategories within this asset class, ranked by AUM
        </div>
      </div>
      <table className="fi-table">
        <thead>
          <tr>
            <th className="fi-row-idx">#</th>
            <th>Subcategory</th>
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
            <SortTh
              label="Flow Int. MTD"
              sortKey="flow_intensity_mtd"
              sort={sort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={r.category}
              className="fi-link"
              onClick={() => {
                const id = r.subcategory_id || categoryIdByName[r.category];
                if (id) navigate(`/flow-intelligence/category/${id}`);
              }}
            >
              <td className="fi-row-idx">{i + 1}</td>
              <td>{r.category}</td>
              <td>{fmtCrTable(r.latest_aum)}</td>
              <td className={signClass(r.flow_intensity_1d)}>
                {fmtRatioPct(r.flow_intensity_1d)}
              </td>
              <td className={signClass(r.flow_intensity_7d)}>
                {fmtRatioPct(r.flow_intensity_7d)}
              </td>
              <td className={signClass(r.flow_intensity_30d)}>
                {fmtRatioPct(r.flow_intensity_30d)}
              </td>
              <td className={signClass(r.flow_intensity_mtd)}>
                {fmtRatioPct(r.flow_intensity_mtd)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Median</td>
            <td className={signClass(med1d)}>{fmtRatioPct(med1d)}</td>
            <td></td>
            <td className={signClass(med30d)}>{fmtRatioPct(med30d)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
export default function AssetClassDetail() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [dir, setDir] = useState(null);
  const [series, setSeries] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setData(null);
    setSeries(null);
    fetchLatestDate()
      .then((d) => {
        Promise.all([fetchAssetClassDetail(name, d), fetchDirectory()])
          .then(([res, directory]) => {
            setData(res);
            setDir(directory);
          })
          .catch((e) => setError(e.message));
        fetchAssetClassSeries(name, daysAgo(d, 182), d).then((r) =>
          setSeries(r.series),
        );
      })
      .catch((e) => setError(e.message));
  }, [name]);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!data || !dir)
    return <div className="fi-panel fi-panel-pad fi-dim">Loading…</div>;
  const s = data.summary;
  const categoryIdByName = Object.fromEntries(
    dir.categories.map((c) => [c.name, c.subcategory_id]),
  );
  const treemapRows = data.subcategories.map((r) => ({
    category: r.category,
    latest_aum: r.latest_aum,
    flow_intensity_1d: r.flow_intensity_1d,
  }));
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
          <div className="fi-stat-label">Net Sales 1D (₹ Cr)</div>
          <div className={`fi-stat-value ${signClass(s?.net_flow_1d)}`}>
            {fmtCr(s?.net_flow_1d)}
          </div>
        </div>
        <div className="fi-stat-tile">
          <div className="fi-stat-label">Net Sales MTD (₹ Cr)</div>
          <div className={`fi-stat-value ${signClass(s?.net_flow_mtd)}`}>
            {fmtCr(s?.net_flow_mtd)}
          </div>
        </div>
      </div>

      <CategoryTreemap
        categories={treemapRows}
        categoryIdByName={categoryIdByName}
      />

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

      <SubcategoryTable
        rows={data.subcategories}
        categoryIdByName={categoryIdByName}
      />
    </>
  );
}
