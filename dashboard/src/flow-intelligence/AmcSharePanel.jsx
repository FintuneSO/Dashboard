import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { fetchAmcPanel, fetchLatestDate } from "./api";
import { fmtRatioPct, signClass, chartColor } from "./format";
import { makeTooltipContent } from "./ChartTooltip";
import StackedBarComposition from "./StackedBarComposition";
import LollipopChart from "./LollipopChart";
import InfoTooltip from "./InfoTooltip";
import { METRIC_HELP } from "./metricHelp";
function topNWithOther(rows, key, n = 8) {
  const sorted = [...rows].sort((a, b) => b[key] - a[key]);
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const otherValue = rest.reduce((s, r) => s + Number(r[key] || 0), 0);
  return rest.length
    ? [
        ...top,
        {
          fund_house_name: `Other (${rest.length})`,
          [key]: otherValue,
          _isOther: true,
        },
      ]
    : top;
}
function ChartScopeSelect({ value, onChange, categories, categoryIdByName }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "var(--panel-sunken)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "4px 8px",
        fontSize: 11,
        fontFamily: "var(--sans)",
      }}
    >
      <option value="">Overall</option>
      {[...categories]
        .sort((a, b) => a.category.localeCompare(b.category))
        .map((c) => (
          <option key={c.category} value={categoryIdByName[c.category] || ""}>
            {c.category}
          </option>
        ))}
    </select>
  );
}
function useAmcPanel(selection) {
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setPanel(null);
    const subcatId = selection ? Number(selection) : null;
    fetchLatestDate()
      .then((d) => fetchAmcPanel(d, subcatId))
      .then(setPanel)
      .catch((e) => setError(e.message));
  }, [selection]);
  return {
    panel,
    error,
  };
}
function SharePieChart({ categories, categoryIdByName, amcIdByName }) {
  const navigate = useNavigate();
  const [selection, setSelection] = useState("");
  const { panel, error } = useAmcPanel(selection);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div>
        <div className="fi-card-title">AMC Share</div>
        <div className="fi-card-subtitle">
          By AUM{panel ? ` — ${panel.amcs.length} AMCs in this selection` : ""}
        </div>
      </div>
      <ChartScopeSelect
        value={selection}
        onChange={setSelection}
        categories={categories}
        categoryIdByName={categoryIdByName}
      />
    </div>
  );
  if (!panel)
    return (
      <div className="fi-panel fi-panel-pad">
        {header}
        <div
          className="fi-dim"
          style={{
            fontSize: 12,
            marginTop: 10,
          }}
        >
          Loading…
        </div>
      </div>
    );
  const amcs = panel.amcs;
  const data = topNWithOther(amcs, "latest_aum");
  const total = amcs.reduce((s, r) => s + Number(r.latest_aum || 0), 0);
  const rankByName = Object.fromEntries(
    [...amcs]
      .sort((a, b) => b.latest_aum - a.latest_aum)
      .map((a, i) => [a.fund_house_name, i + 1]),
  );
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.fund_house_name,
    subtitle: d._isOther
      ? `${amcs.length - 8} smaller AMCs combined`
      : `Rank #${rankByName[d.fund_house_name]} by AUM`,
    rows: [
      {
        label: "AUM",
        value: `${Math.round(d.latest_aum).toLocaleString("en-IN")} Cr`,
      },
      {
        label: "Share",
        value: `${((d.latest_aum / total) * 100).toFixed(1)}%`,
      },
      ...(d._isOther
        ? []
        : [
            {
              label: "Flow Int. 1D",
              value: fmtRatioPct(d.flow_intensity_1d),
              className: signClass(d.flow_intensity_1d),
            },
            {
              label: "Sales 1D",
              value: `${Math.round(d.sales_1d).toLocaleString("en-IN")} Cr`,
              className: signClass(d.sales_1d),
            },
          ]),
    ],
  }));
  return (
    <div className="fi-panel fi-panel-pad">
      {header}
      <div
        style={{
          height: 260,
          marginTop: 10,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="latest_aum"
              nameKey="fund_house_name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={90}
              paddingAngle={1}
              minAngle={3}
              onClick={(d) =>
                !d._isOther &&
                amcIdByName[d.fund_house_name] &&
                navigate(
                  `/flow-intelligence/amc/${amcIdByName[d.fund_house_name]}`,
                )
              }
              style={{
                cursor: "pointer",
              }}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d._isOther ? "var(--border-strong)" : chartColor(i)}
                />
              ))}
            </Pie>
            <Tooltip content={tooltipContent} />
            <Legend
              wrapperStyle={{
                fontSize: 10.5,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function NetFlowBarChart({ categories, categoryIdByName, amcIdByName }) {
  const navigate = useNavigate();
  const [selection, setSelection] = useState("");
  const { panel, error } = useAmcPanel(selection);
  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div>
        <div className="fi-card-title">Net Sales by AMC — 1D</div>
        <div className="fi-card-subtitle">
          Strongest inflows and outflows in this selection, ₹ Cr
        </div>
      </div>
      <ChartScopeSelect
        value={selection}
        onChange={setSelection}
        categories={categories}
        categoryIdByName={categoryIdByName}
      />
    </div>
  );
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!panel)
    return (
      <div className="fi-panel fi-panel-pad">
        {header}
        <div
          className="fi-dim"
          style={{
            fontSize: 12,
            marginTop: 10,
          }}
        >
          Loading…
        </div>
      </div>
    );
  const ranked = [...panel.amcs].sort((a, b) => b.sales_1d - a.sales_1d);
  const top5 = ranked.slice(0, 5);
  const bottom5 = ranked.slice(-5).reverse();
  const seen = new Set();
  const data = [...top5, ...bottom5].filter((d) =>
    seen.has(d.fund_house_name) ? false : seen.add(d.fund_house_name),
  );
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.fund_house_name,
    subtitle: d.sales_1d >= 0 ? "Strongest inflow" : "Strongest outflow",
    rows: [
      {
        label: "Net Sales 1D",
        value: `${Math.round(d.sales_1d).toLocaleString("en-IN")} Cr`,
        className: signClass(d.sales_1d),
      },
      {
        label: "Sales 30D",
        value: `${Math.round(d.sales_30d).toLocaleString("en-IN")} Cr`,
        className: signClass(d.sales_30d),
      },
      {
        label: "AUM",
        value: `${Math.round(d.latest_aum).toLocaleString("en-IN")} Cr`,
      },
      {
        label: "Flow Int. 1D",
        value: fmtRatioPct(d.flow_intensity_1d),
        className: signClass(d.flow_intensity_1d),
      },
    ],
  }));
  return (
    <div className="fi-panel fi-panel-pad">
      {header}
      <div
        style={{
          marginTop: 10,
        }}
      >
        <LollipopChart
          data={data}
          dataKey="sales_1d"
          nameKey="fund_house_name"
          tooltipContent={tooltipContent}
          onNameClick={(name) =>
            amcIdByName[name] &&
            navigate(`/flow-intelligence/amc/${amcIdByName[name]}`)
          }
        />
      </div>
    </div>
  );
}
function FlowIntensityRankChart({ categories, categoryIdByName, amcIdByName }) {
  const navigate = useNavigate();
  const [selection, setSelection] = useState("");
  const { panel, error } = useAmcPanel(selection);
  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div>
        <div className="fi-card-title">
          Flow Intensity Ranking
          <InfoTooltip>{METRIC_HELP.flowIntensity}</InfoTooltip>
        </div>
        <div className="fi-card-subtitle">
          Normalized by opening AUM — not dominated by AMC size
        </div>
      </div>
      <ChartScopeSelect
        value={selection}
        onChange={setSelection}
        categories={categories}
        categoryIdByName={categoryIdByName}
      />
    </div>
  );
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!panel)
    return (
      <div className="fi-panel fi-panel-pad">
        {header}
        <div
          className="fi-dim"
          style={{
            fontSize: 12,
            marginTop: 10,
          }}
        >
          Loading…
        </div>
      </div>
    );
  const ranked = [...panel.amcs]
    .filter((a) => a.flow_intensity_1d !== null)
    .sort((a, b) => b.flow_intensity_1d - a.flow_intensity_1d);
  const top5 = ranked.slice(0, 5);
  const bottom5 = ranked.slice(-5).reverse();
  const seen = new Set();
  const data = [...top5, ...bottom5].filter((d) =>
    seen.has(d.fund_house_name) ? false : seen.add(d.fund_house_name),
  );
  const tooltipContent = makeTooltipContent((d) => ({
    title: d.fund_house_name,
    subtitle:
      d.flow_intensity_1d >= 0 ? "Accelerating inflow" : "Accelerating outflow",
    rows: [
      {
        label: "Flow Intensity 1D",
        value: fmtRatioPct(d.flow_intensity_1d),
        className: signClass(d.flow_intensity_1d),
      },
      {
        label: "Net Sales 1D",
        value: `${Math.round(d.sales_1d).toLocaleString("en-IN")} Cr`,
        className: signClass(d.sales_1d),
      },
      {
        label: "AUM",
        value: `${Math.round(d.latest_aum).toLocaleString("en-IN")} Cr`,
      },
    ],
  }));
  return (
    <div className="fi-panel fi-panel-pad">
      {header}
      <div
        style={{
          marginTop: 10,
        }}
      >
        <LollipopChart
          data={data}
          dataKey="flow_intensity_1d"
          nameKey="fund_house_name"
          tooltipContent={tooltipContent}
          xTickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
          onNameClick={(name) =>
            amcIdByName[name] &&
            navigate(`/flow-intelligence/amc/${amcIdByName[name]}`)
          }
        />
      </div>
    </div>
  );
}
function AssetClassMixChart({ categories, categoryIdByName }) {
  const navigate = useNavigate();
  const { panel, error } = useAmcPanel("");
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  if (!panel || !panel.asset_class_mix) return null;
  const rows = panel.asset_class_mix;
  return (
    <div className="fi-panel fi-panel-pad">
      <div className="fi-card-title">Asset Class Mix</div>
      <div className="fi-card-subtitle">
        Industry AUM split by Equity/Debt/Hybrid/... — one bar, proportional to
        AUM
      </div>
      <div
        style={{
          marginTop: 14,
        }}
      >
        <StackedBarComposition
          rows={rows}
          nameKey="asset_class"
          valueKey="latest_aum"
          onSegmentClick={(name) =>
            navigate(
              `/flow-intelligence/asset-class/${encodeURIComponent(name)}`,
            )
          }
          formatValue={(v) => `${Math.round(v).toLocaleString("en-IN")} Cr`}
        />
      </div>
    </div>
  );
}
export default function AmcSharePanel({
  categories,
  categoryIdByName,
  amcIdByName,
}) {
  return (
    <div className="fi-panel">
      <div className="fi-panel-head">
        <div className="fi-section-title">AMC Breakdown</div>
        <div className="fi-section-subtitle">
          Each chart below has its own Overall/Category filter — scope them
          independently
        </div>
      </div>
      <div
        className="fi-panel-pad"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div className="fi-section-grid">
          <SharePieChart
            categories={categories}
            categoryIdByName={categoryIdByName}
            amcIdByName={amcIdByName}
          />
          <NetFlowBarChart
            categories={categories}
            categoryIdByName={categoryIdByName}
            amcIdByName={amcIdByName}
          />
        </div>
        <FlowIntensityRankChart
          categories={categories}
          categoryIdByName={categoryIdByName}
          amcIdByName={amcIdByName}
        />
        <AssetClassMixChart
          categories={categories}
          categoryIdByName={categoryIdByName}
        />
      </div>
    </div>
  );
}
