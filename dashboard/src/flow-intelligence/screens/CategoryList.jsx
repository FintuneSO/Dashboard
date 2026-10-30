import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCategoryList, fetchLatestDate, fetchDirectory } from "../api";
import { fmtRatioPct, fmtCrTable, signClass, median } from "../format";
import { useSort, sortRows, SortTh } from "../DataTable";
import CategoryUniversePanel from "../CategoryUniversePanel";
import InfoTooltip from "../InfoTooltip";
import { METRIC_HELP } from "../metricHelp";
export default function CategoryList() {
  const [categories, setCategories] = useState(null);
  const [dir, setDir] = useState(null);
  const [error, setError] = useState(null);
  const sort = useSort("latest_aum");
  const navigate = useNavigate();
  useEffect(() => {
    fetchLatestDate()
      .then((d) => Promise.all([fetchCategoryList(d), fetchDirectory()]))
      .then(([res, directory]) => {
        setCategories(res.categories);
        setDir(directory);
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!categories)
    return <div className="fi-panel fi-panel-pad fi-dim">Loading…</div>;
  const idByName = Object.fromEntries(
    dir.categories.map((c) => [c.name, c.subcategory_id]),
  );
  const rows = sortRows(categories, sort.key, sort.dir);
  const med1d = median(categories.map((c) => c.flow_intensity_1d));
  const med30d = median(categories.map((c) => c.flow_intensity_30d));
  return (
    <>
      <CategoryUniversePanel
        categories={categories}
        categoryIdByName={idByName}
      />
      <div className="fi-panel">
        <div className="fi-panel-head">
          <div className="fi-section-title">All Categories</div>
          <div className="fi-section-subtitle">
            {categories.length} categories — flow intensity normalized by
            opening AUM
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
              <SortTh
                label="Flow Int. MTD"
                sortKey="flow_intensity_mtd"
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
                  idByName[c.category] &&
                  navigate(
                    `/flow-intelligence/category/${idByName[c.category]}`,
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
                <td className={signClass(c.flow_intensity_mtd)}>
                  {fmtRatioPct(c.flow_intensity_mtd)}
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
    </>
  );
}
