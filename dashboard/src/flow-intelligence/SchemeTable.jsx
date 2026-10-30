import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fmtRatioPct, fmtPct, fmtCrTable, signClass, median } from "./format";
import { useSort, sortRows, SortTh } from "./DataTable";
import InfoTooltip from "./InfoTooltip";
import { METRIC_HELP } from "./metricHelp";
const PAGE_SIZE = 25;
export default function SchemeTable({ schemes, title, subtitle }) {
  const sort = useSort("latest_aum");
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const rows = sortRows(schemes, sort.key, sort.dir);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  useEffect(() => {
    setPage(0);
  }, [schemes, sort.key, sort.dir]);
  const med = (key) => median(schemes.map((s) => s[key]));
  return (
    <div className="fi-panel">
      {title && (
        <div className="fi-panel-head">
          <div className="fi-section-title">{title}</div>
          {subtitle && <div className="fi-section-subtitle">{subtitle}</div>}
        </div>
      )}
      <div
        style={{
          overflowX: "auto",
        }}
      >
        <table className="fi-table">
          <thead>
            <tr>
              <th className="fi-row-idx">#</th>
              <th>Scheme</th>
              <SortTh label="AUM (₹ Cr)" sortKey="latest_aum" sort={sort} />
              <SortTh label="Sales 1D" sortKey="sales_1d" sort={sort} />
              <SortTh label="Sales 7D" sortKey="sales_7d" sort={sort} />
              <SortTh label="Sales 30D" sortKey="sales_30d" sort={sort} />
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
                label="Flow Int. 30D"
                sortKey="flow_intensity_30d"
                sort={sort}
              />
              <SortTh label="1M Ret" sortKey="return_1m" sort={sort} />
              <SortTh label="1Y Ret" sortKey="return_1y" sort={sort} />
              <SortTh label="3Y Ret" sortKey="return_3y" sort={sort} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s, i) => (
              <tr
                key={s.scheme_id}
                className="fi-link"
                onClick={() =>
                  navigate(`/flow-intelligence/scheme/${s.scheme_id}`)
                }
              >
                <td className="fi-row-idx">{page * PAGE_SIZE + i + 1}</td>
                <td>{s.scheme_name}</td>
                <td>{fmtCrTable(s.latest_aum)}</td>
                <td className={signClass(s.sales_1d)}>
                  {fmtCrTable(s.sales_1d)}
                </td>
                <td className={signClass(s.sales_7d)}>
                  {fmtCrTable(s.sales_7d)}
                </td>
                <td className={signClass(s.sales_30d)}>
                  {fmtCrTable(s.sales_30d)}
                </td>
                <td className={signClass(s.flow_intensity_1d)}>
                  {fmtRatioPct(s.flow_intensity_1d)}
                </td>
                <td className={signClass(s.flow_intensity_30d)}>
                  {fmtRatioPct(s.flow_intensity_30d)}
                </td>
                <td className={signClass(s.return_1m)}>
                  {fmtPct(s.return_1m, 1)}
                </td>
                <td className={signClass(s.return_1y)}>
                  {fmtPct(s.return_1y, 1)}
                </td>
                <td className={signClass(s.return_3y)}>
                  {fmtPct(s.return_3y, 1)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Median (all {schemes.length})</td>
              <td className={signClass(med("sales_1d"))}>
                {fmtCrTable(med("sales_1d") || 0)}
              </td>
              <td className={signClass(med("sales_7d"))}>
                {fmtCrTable(med("sales_7d") || 0)}
              </td>
              <td className={signClass(med("sales_30d"))}>
                {fmtCrTable(med("sales_30d") || 0)}
              </td>
              <td className={signClass(med("flow_intensity_1d"))}>
                {fmtRatioPct(med("flow_intensity_1d"))}
              </td>
              <td className={signClass(med("flow_intensity_30d"))}>
                {fmtRatioPct(med("flow_intensity_30d"))}
              </td>
              <td className={signClass(med("return_1m"))}>
                {fmtPct(med("return_1m"), 1)}
              </td>
              <td className={signClass(med("return_1y"))}>
                {fmtPct(med("return_1y"), 1)}
              </td>
              <td className={signClass(med("return_3y"))}>
                {fmtPct(med("return_3y"), 1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {pageCount > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderTop: "1px solid var(--border)",
            fontSize: 11.5,
          }}
        >
          <span className="fi-dim">
            {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <div
            style={{
              display: "flex",
              gap: 6,
            }}
          >
            <button
              className="fi-theme-toggle"
              style={{
                width: "auto",
                padding: "0 10px",
              }}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <span
              className="fi-dim"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 4px",
              }}
            >
              Page {page + 1} / {pageCount}
            </span>
            <button
              className="fi-theme-toggle"
              style={{
                width: "auto",
                padding: "0 10px",
              }}
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
