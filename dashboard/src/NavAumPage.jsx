import { useEffect, useState } from "react";
import { fetchFundHouses } from "./api";
import ReportTabs from "./ReportTabs";
import { useAppliedFilters } from "./useAppliedFilters";
import { useLatestDate } from "./useLatestDate";
const FALLBACK_DATE = "2026-10-16";
function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
export default function NavAumPage({
  title,
  subtitle,
  valueLabel,
  valueKey,
  fetchRows,
  getExportUrl,
}) {
  const { draft, applied, isDirty, setDraftField, apply, setField } =
    useAppliedFilters({
      date: FALLBACK_DATE,
      fundHouse: "All",
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
      .then((list) => setFundHouses(["All", ...list]))
      .catch(() => setFundHouses(["All"]));
  }, []);
  useEffect(() => {
    if (!latestDate && !dateTouchedByUser) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRows(applied.date, applied.report)
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
  }, [applied.date, applied.report, latestDate, dateTouchedByUser]);
  const filteredRows =
    applied.fundHouse && applied.fundHouse !== "All"
      ? rows.filter((r) => r.fund_house === applied.fundHouse)
      : rows;
  return (
    <div className="page">
      <header className="page-header">
        <h1>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
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
          href={getExportUrl(applied.date, applied.report)}
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
                  <th>Scheme Name</th>
                  <th>Fund House</th>
                  <th>Category</th>
                  <th>{valueLabel}</th>
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
                  filteredRows.map((row) => (
                    <tr key={row.scheme_name}>
                      <td>{row.scheme_name}</td>
                      <td>{row.fund_house}</td>
                      <td className="cell-category">{row.category}</td>
                      <td>{formatNumber(row[valueKey])}</td>
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
