import { useEffect, useState } from "react";
import { fetchRollingWeekly, getRollingWeeklyExportUrl } from "./api";
import ReportTabs from "./ReportTabs";
import { useAppliedFilters } from "./useAppliedFilters";
import { useLatestDate } from "./useLatestDate";
const FALLBACK_DATE = "2026-09-25";
function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}
function ValueCell({ value }) {
  const cls =
    value > 0 ? "cell-positive" : value < 0 ? "cell-negative" : "cell-zero";
  return <td className={cls}>{formatNumber(value)}</td>;
}
function Top5Table({ title, rowLabel, rows, labelKey }) {
  return (
    <div className="pivot-table-wrap">
      <h2>{title}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{rowLabel}</th>
              <th>Sum of 7 day Sales</th>
              <th>Sum of 7 day AUM change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[labelKey]}>
                <td className="cell-category">{row[labelKey]}</td>
                <ValueCell value={row.sales_7d} />
                <ValueCell value={row.aum_change_7d} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default function RollingWeekly() {
  const { draft, applied, isDirty, setDraftField, apply, setField } =
    useAppliedFilters({
      date: FALLBACK_DATE,
      report: null,
    });
  const [data, setData] = useState({
    top_schemes: [],
    top_categories: [],
    top_amcs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latestDate = useLatestDate();
  const [dateTouchedByUser, setDateTouchedByUser] = useState(false);
  useEffect(() => {
    if (latestDate && !dateTouchedByUser) {
      setField("date", latestDate);
    }
  }, [latestDate]);
  useEffect(() => {
    if (!latestDate && !dateTouchedByUser) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRollingWeekly(applied.date, applied.report)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied.date, applied.report, latestDate, dateTouchedByUser]);
  return (
    <div className="page">
      <header className="page-header">
        <h1>Rolling Weekly Dashboard</h1>
        <p className="page-subtitle">
          Top 5 schemes, categories, and AMCs industry-wide, ranked by 7-day
          Sales.
        </p>
      </header>

      <ReportTabs
        value={draft.report}
        onChange={(v) => setDraftField("report", v)}
      />

      <div className="filters-bar">
        <label>
          As of date
          <input
            type="date"
            value={draft.date}
            onChange={(e) => {
              setDateTouchedByUser(true);
              setDraftField("date", e.target.value);
            }}
          />
        </label>

        <div className="filters-spacer" />

        <button
          className={isDirty ? "btn btn-primary is-dirty" : "btn btn-primary"}
          onClick={apply}
        >
          Apply
        </button>

        <a
          className="btn btn-secondary"
          href={getRollingWeeklyExportUrl(applied.date, applied.report)}
          download
        >
          Export to Excel
        </a>
      </div>

      {error && <div className="table-error">Failed to load: {error}</div>}
      {!error && loading && <div className="table-loading">Loading…</div>}
      {!error && !loading && (
        <div
          className="pivot-side-by-side"
          style={{
            gridTemplateColumns: "1fr 1fr 1fr",
          }}
        >
          <Top5Table
            title="Top 5 Schemes"
            rowLabel="Scheme Name"
            rows={data.top_schemes}
            labelKey="scheme_name"
          />
          <Top5Table
            title="Top 5 Categories"
            rowLabel="Category"
            rows={data.top_categories}
            labelKey="category"
          />
          <Top5Table
            title="Top 5 AMC"
            rowLabel="Fund House"
            rows={data.top_amcs}
            labelKey="fund_house_name"
          />
        </div>
      )}
    </div>
  );
}
