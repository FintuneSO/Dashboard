import { useEffect, useState } from "react";
import { fetchTopSchemes, getTopSchemesExportUrl } from "./api";
import ReportTabs from "./ReportTabs";
import { useAppliedFilters } from "./useAppliedFilters";
import { useLatestDate } from "./useLatestDate";
const FALLBACK_DATE = "2026-09-25";
const SALES_WINDOWS = [
  "sales_1d",
  "sales_3d",
  "sales_7d",
  "sales_14d",
  "sales_30d",
];
const AUM_WINDOWS = [
  "aum_change_1d",
  "aum_change_3d",
  "aum_change_7d",
  "aum_change_14d",
  "aum_change_30d",
];
const LABELS = ["1d", "3d", "7d", "14d", "30d"];
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
function SchemeTable({ title, rows, windowKeys }) {
  return (
    <div className="pivot-table-wrap">
      <h2>{title}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Scheme Name</th>
              {LABELS.map((l) => (
                <th key={l}>{l} Sales</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category}>
                <td className="cell-category">{row.category}</td>
                <td>{row.scheme_name}</td>
                {windowKeys.map((key) => (
                  <ValueCell key={key} value={row[key]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default function TopSchemes() {
  const { draft, applied, isDirty, setDraftField, apply, setField } =
    useAppliedFilters({
      date: FALLBACK_DATE,
      report: null,
    });
  const latestDate = useLatestDate();
  const [dateTouchedByUser, setDateTouchedByUser] = useState(false);
  useEffect(() => {
    if (latestDate && !dateTouchedByUser) {
      setField("date", latestDate);
    }
  }, [latestDate]);
  const [bySales, setBySales] = useState([]);
  const [byAumChange, setByAumChange] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!latestDate && !dateTouchedByUser) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTopSchemes(applied.date, applied.report)
      .then((data) => {
        if (cancelled) return;
        setBySales(data.by_sales);
        setByAumChange(data.by_aum_change);
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
        <h1>Top Schemes</h1>
        <p className="page-subtitle">
          The single best-performing scheme per category, shown two ways: ranked
          by 30-day Sales, and separately ranked by raw 30-day AUM change. These
          can (and often do) crown different winners, since AUM change includes
          pure price movement while Sales strips that out.
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
          href={getTopSchemesExportUrl(applied.date, applied.report)}
          download
        >
          Export to Excel
        </a>
      </div>

      {error && <div className="table-error">Failed to load: {error}</div>}
      {!error && loading && <div className="table-loading">Loading…</div>}
      {!error && !loading && (
        <div className="pivot-side-by-side">
          <SchemeTable
            title="Top scheme by 30 day Sales"
            rows={bySales}
            windowKeys={SALES_WINDOWS}
          />
          <SchemeTable
            title="Top scheme by 30 day absolute AUM Change"
            rows={byAumChange}
            windowKeys={AUM_WINDOWS}
          />
        </div>
      )}
    </div>
  );
}
