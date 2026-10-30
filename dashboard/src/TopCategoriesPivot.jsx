import { useEffect, useState } from "react";
import {
  fetchCategorySales,
  fetchFundHouses,
  getCategorySalesExportUrl,
} from "./api";
import ReportTabs from "./ReportTabs";
import { useAppliedFilters } from "./useAppliedFilters";
import { useLatestDate } from "./useLatestDate";
const FALLBACK_DATE = "2026-09-22";
const WINDOW_LABELS = {
  "1d": "Sum of 1 day Sales",
  "3d": "Sum of 3 day Sales",
  "7d": "Sum of 7 day Sales",
  "14d": "Sum of 14 day Sales",
  "30d": "Sum of 30 day Sales",
  mtd: "Sum of MTD Sales",
};
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
function CategoryTable({ title, fundHouseLabel, rows, loading, error }) {
  return (
    <div className="pivot-table-wrap">
      <h2>{title}</h2>
      <div className="pivot-filter-label">
        Fund House: <strong>{fundHouseLabel}</strong>
      </div>
      {error && <div className="table-error">Failed to load: {error}</div>}
      {!error && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                {Object.values(WINDOW_LABELS).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="table-loading">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.category}>
                    <td className="cell-category">{row.category}</td>
                    <ValueCell value={row["1d"]} />
                    <ValueCell value={row["3d"]} />
                    <ValueCell value={row["7d"]} />
                    <ValueCell value={row["14d"]} />
                    <ValueCell value={row["30d"]} />
                    <ValueCell value={row.mtd} />
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default function TopCategoriesPivot() {
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
  const [industryRows, setIndustryRows] = useState([]);
  const [industryLoading, setIndustryLoading] = useState(true);
  const [industryError, setIndustryError] = useState(null);
  const [clientRows, setClientRows] = useState([]);
  const [clientLoading, setClientLoading] = useState(true);
  const [clientError, setClientError] = useState(null);
  useEffect(() => {
    fetchFundHouses()
      .then(setFundHouses)
      .catch(() => setFundHouses([]));
  }, []);
  useEffect(() => {
    if (!latestDate && !dateTouchedByUser) return;
    let cancelled = false;
    setIndustryLoading(true);
    setIndustryError(null);
    fetchCategorySales(applied.date, null, applied.report)
      .then((result) => {
        if (!cancelled) setIndustryRows(result);
      })
      .catch((e) => {
        if (!cancelled) setIndustryError(e.message);
      })
      .finally(() => {
        if (!cancelled) setIndustryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied.date, applied.report, latestDate, dateTouchedByUser]);
  useEffect(() => {
    if (!applied.fundHouse) return;
    if (!latestDate && !dateTouchedByUser) return;
    let cancelled = false;
    setClientLoading(true);
    setClientError(null);
    fetchCategorySales(applied.date, applied.fundHouse, applied.report)
      .then((result) => {
        if (!cancelled) setClientRows(result);
      })
      .catch((e) => {
        if (!cancelled) setClientError(e.message);
      })
      .finally(() => {
        if (!cancelled) setClientLoading(false);
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
        <h1>Top Categories Pivot</h1>
        <p className="page-subtitle">
          Estimated net Sales (Cr) by category, across time windows. Live data
          from the database via the FastAPI backend.
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
          Compare against fund house
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
          href={getCategorySalesExportUrl(
            applied.date,
            applied.fundHouse,
            applied.report,
          )}
          download
        >
          Export to Excel
        </a>
      </div>

      <div className="pivot-side-by-side">
        <CategoryTable
          title="Industry-wide"
          fundHouseLabel="All"
          rows={industryRows}
          loading={industryLoading}
          error={industryError}
        />
        <CategoryTable
          title="Client view"
          fundHouseLabel={applied.fundHouse}
          rows={clientRows}
          loading={clientLoading}
          error={clientError}
        />
      </div>
    </div>
  );
}
