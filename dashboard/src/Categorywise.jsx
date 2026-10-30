import { Fragment, useEffect, useState } from "react";
import {
  fetchCategorywise,
  fetchFundHouses,
  getCategorywiseExportUrl,
} from "./api";
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
  return `${sign}${(n * 100).toFixed(1)}%`;
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
export default function Categorywise() {
  const { draft, applied, isDirty, setDraftField, apply, setField } =
    useAppliedFilters({
      date: FALLBACK_DATE,
      fundHouse: "Aditya Birla Sun Life",
      report: null,
    });
  const [fundHouses, setFundHouses] = useState([]);
  const [rows, setRows] = useState([]);
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
    fetchFundHouses()
      .then(setFundHouses)
      .catch(() => setFundHouses([]));
  }, []);
  useEffect(() => {
    if (!applied.fundHouse) return;
    if (!latestDate && !dateTouchedByUser) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCategorywise(applied.date, applied.fundHouse, applied.report)
      .then((result) => {
        if (!cancelled) setRows(result);
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
  }, [
    applied.date,
    applied.fundHouse,
    applied.report,
    latestDate,
    dateTouchedByUser,
  ]);
  return (
    <div className="page">
      <header className="page-header">
        <h1>Categorywise</h1>
        <p className="page-subtitle">
          Industry vs. client Sales per category, with the client's share of
          industry Sales (% Sales = Client / Industry) for each time window.
          "NA" means the selected fund house has no scheme in that category.
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
        <label>
          Fund House
          <select
            value={draft.fundHouse}
            onChange={(e) => setDraftField("fundHouse", e.target.value)}
          >
            {fundHouses.map((fh) => (
              <option key={fh} value={fh}>
                {fh}
              </option>
            ))}
          </select>
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
          href={getCategorywiseExportUrl(
            applied.date,
            applied.fundHouse,
            applied.report,
          )}
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
                  {WINDOWS.map((w) => (
                    <th key={w} colSpan={3}>
                      {w.toUpperCase()} Sales
                    </th>
                  ))}
                </tr>
                <tr>
                  {WINDOWS.map((w) => (
                    <Fragment key={w}>
                      <th>Industry</th>
                      <th>Client</th>
                      <th>% Sales</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={1 + WINDOWS.length * 3}
                      className="table-loading"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row) => (
                    <tr key={row.category}>
                      <td className="cell-category">{row.category}</td>
                      {WINDOWS.map((w) => (
                        <Fragment key={w}>
                          <ValueCell value={row[`industry_${w}`]} />
                          <ValueCell value={row[`client_${w}`]} />
                          <ValueCell value={row[`pct_${w}`]} isPct />
                        </Fragment>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
