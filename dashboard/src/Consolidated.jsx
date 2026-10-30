import { Fragment, useEffect, useState } from "react";
import { fetchConsolidated, getConsolidatedExportUrl } from "./api";
import ReportTabs from "./ReportTabs";
import { useAppliedFilters } from "./useAppliedFilters";
import { useLatestDate } from "./useLatestDate";
const FALLBACK_DATE = "2026-09-25";
const WINDOWS = ["1d", "3d", "7d", "14d", "30d", "mtd"];
function formatNumber(n) {
  if (n === null || n === undefined) return "NA";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}
function formatPct(n) {
  if (n === null || n === undefined) return "NA";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(2)}%`;
}
function ValueCell({ value, isPct }) {
  if (value === null || value === undefined) {
    return <td className="cell-zero">NA</td>;
  }
  const cls =
    value > 0 ? "cell-positive" : value < 0 ? "cell-negative" : "cell-zero";
  return (
    <td className={cls}>{isPct ? formatPct(value) : formatNumber(value)}</td>
  );
}
function MetricCells({ row }) {
  return (
    <>
      <ValueCell value={row.latest_aum} />
      {WINDOWS.map((w) => (
        <Fragment key={w}>
          <ValueCell value={row[`aum_change_${w}`]} />
          <ValueCell value={row[`sales_${w}`]} />
          <ValueCell value={row[`mkt_action_${w}`]} isPct />
        </Fragment>
      ))}
    </>
  );
}
export default function Consolidated() {
  const { draft, applied, isDirty, setDraftField, apply, setField } =
    useAppliedFilters({
      date: FALLBACK_DATE,
      report: null,
    });
  const [categories, setCategories] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [expanded, setExpanded] = useState({});
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
    fetchConsolidated(applied.date, applied.report)
      .then((result) => {
        if (!cancelled) {
          setCategories(result.categories);
          setSchemes(result.schemes);
          setExpanded({});
        }
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
  const schemesByCategory = {};
  for (const s of schemes) {
    (schemesByCategory[s.category] ||= []).push(s);
  }
  const colCount = 1 + 1 + WINDOWS.length * 3;
  return (
    <div className="page">
      <header className="page-header">
        <h1>Consolidated</h1>
        <p className="page-subtitle">
          Latest AUM, AUM change, Sales, and Market Action % for every window,
          rolled up by category (click a row to see its constituent schemes),
          plus each category's rolling 100-day Mean&#177;2SD outlier bounds for
          Market Action and Sales.
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
          href={getConsolidatedExportUrl(applied.date, applied.report)}
          download
        >
          Export to Excel
        </a>
      </div>

      <div
        className="pivot-table-wrap"
        style={{
          maxWidth: "100%",
        }}
      >
        {error && <div className="table-error">Failed to load: {error}</div>}
        {!error && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>Category</th>
                  <th rowSpan={2}>Latest AUM</th>
                  {WINDOWS.map((w) => (
                    <th key={w} colSpan={3}>
                      {w.toUpperCase()}
                    </th>
                  ))}
                </tr>
                <tr>
                  {WINDOWS.map((w) => (
                    <Fragment key={w}>
                      <th>AUM Change</th>
                      <th>Sales</th>
                      <th>Mkt Action %</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={colCount} className="table-loading">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  categories.map((row) => {
                    const isOpen = !!expanded[row.category];
                    const rowSchemes = schemesByCategory[row.category] || [];
                    return (
                      <Fragment key={row.category}>
                        <tr
                          className="cell-category-row"
                          style={{
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            setExpanded((e) => ({
                              ...e,
                              [row.category]: !e[row.category],
                            }))
                          }
                        >
                          <td className="cell-category">
                            {isOpen ? "▾" : "▸"} {row.category}
                          </td>
                          <MetricCells row={row} />
                        </tr>
                        {isOpen &&
                          rowSchemes.map((s) => (
                            <tr key={s.scheme_id}>
                              <td className="cell-scheme-indent">
                                {s.scheme_name}
                              </td>
                              <MetricCells row={s} />
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
