import { useEffect, useState } from "react";
import {
  fetchTopPlayers,
  fetchFundHouses,
  getTopPlayersExportUrl,
} from "./api";
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
export default function TopPlayers() {
  const { draft, applied, isDirty, setDraftField, apply, setField } =
    useAppliedFilters({
      date: FALLBACK_DATE,
      fundHouse: "Aditya Birla Sun Life",
      report: null,
    });
  const [fundHouses, setFundHouses] = useState([]);
  const latestDate = useLatestDate();
  const [dateTouchedByUser, setDateTouchedByUser] = useState(false);
  useEffect(() => {
    if (latestDate && !dateTouchedByUser) {
      setField("date", latestDate);
    }
  }, [latestDate]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchFundHouses()
      .then(setFundHouses)
      .catch(() => setFundHouses([]));
  }, []);
  useEffect(() => {
    if (!latestDate && !dateTouchedByUser) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTopPlayers(applied.date, applied.fundHouse, applied.report)
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
  let lastCategory = null;
  return (
    <div className="page">
      <header className="page-header">
        <h1>Top Players</h1>
        <p className="page-subtitle">
          Top 10 schemes per category by 1-day Sales. The selected fund house's
          own best scheme is pinned as an 11th row (highlighted) if it's not
          already in the top 10.
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
          Pin fund house
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
          href={getTopPlayersExportUrl(
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
          maxWidth: 900,
        }}
      >
        {error && <div className="table-error">Failed to load: {error}</div>}
        {!error && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Scheme Name</th>
                  <th>Sum of 1 day Sales</th>
                  <th>Sum of MTD Sales</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="table-loading">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row, i) => {
                    const showCategory = row.category !== lastCategory;
                    lastCategory = row.category;
                    return (
                      <tr
                        key={`${row.category}-${row.scheme_name}-${i}`}
                        className={row.is_client_pin ? "row-pinned" : ""}
                      >
                        <td className="cell-category">
                          {showCategory ? row.category : ""}
                        </td>
                        <td>{row.scheme_name}</td>
                        <ValueCell value={row.sales_1d} />
                        <ValueCell value={row.sales_mtd} />
                      </tr>
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
