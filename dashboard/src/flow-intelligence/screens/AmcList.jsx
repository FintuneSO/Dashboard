import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAmcList, fetchLatestDate, fetchDirectory } from "../api";
import { fmtRatioPct, fmtCrTable, signClass, median } from "../format";
import { useSort, sortRows, SortTh } from "../DataTable";
import AmcUniversePanel from "../AmcUniversePanel";
import InfoTooltip from "../InfoTooltip";
import { METRIC_HELP } from "../metricHelp";
export default function AmcList() {
  const [amcs, setAmcs] = useState(null);
  const [dir, setDir] = useState(null);
  const [error, setError] = useState(null);
  const sort = useSort("latest_aum");
  const navigate = useNavigate();
  useEffect(() => {
    fetchLatestDate()
      .then((d) => Promise.all([fetchAmcList(d), fetchDirectory()]))
      .then(([res, directory]) => {
        setAmcs(res.amcs);
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
  if (!amcs)
    return <div className="fi-panel fi-panel-pad fi-dim">Loading…</div>;
  const idByName = Object.fromEntries(
    dir.amcs.map((a) => [a.name, a.fund_house_id]),
  );
  const rows = sortRows(amcs, sort.key, sort.dir);
  const med1d = median(amcs.map((a) => a.flow_intensity_1d));
  const med30d = median(amcs.map((a) => a.flow_intensity_30d));
  return (
    <>
      <AmcUniversePanel amcIdByName={idByName} />
      <div className="fi-panel">
        <div className="fi-panel-head">
          <div className="fi-section-title">All AMCs</div>
          <div className="fi-section-subtitle">
            {amcs.length} fund houses — flow intensity normalized by opening AUM
          </div>
        </div>
        <table className="fi-table">
          <thead>
            <tr>
              <th className="fi-row-idx">#</th>
              <th>AMC</th>
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
            {rows.map((a, i) => (
              <tr
                key={a.fund_house_name}
                className="fi-link"
                onClick={() =>
                  idByName[a.fund_house_name] &&
                  navigate(
                    `/flow-intelligence/amc/${idByName[a.fund_house_name]}`,
                  )
                }
              >
                <td className="fi-row-idx">{i + 1}</td>
                <td>{a.fund_house_name}</td>
                <td>{fmtCrTable(a.latest_aum)}</td>
                <td className={signClass(a.flow_intensity_1d)}>
                  {fmtRatioPct(a.flow_intensity_1d)}
                </td>
                <td className={signClass(a.flow_intensity_7d)}>
                  {fmtRatioPct(a.flow_intensity_7d)}
                </td>
                <td className={signClass(a.flow_intensity_30d)}>
                  {fmtRatioPct(a.flow_intensity_30d)}
                </td>
                <td className={signClass(a.flow_intensity_mtd)}>
                  {fmtRatioPct(a.flow_intensity_mtd)}
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
