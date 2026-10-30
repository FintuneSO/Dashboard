const OPTIONS = [
  {
    value: null,
    label: "All",
  },
  {
    value: "eq_hy",
    label: "Equity & Hybrid",
  },
  {
    value: "debt",
    label: "Debt",
  },
  {
    value: "others",
    label: "Others",
  },
];
export default function ReportTabs({ value, onChange }) {
  return (
    <div className="report-tabs">
      {OPTIONS.map((opt) => (
        <button
          key={opt.label}
          className={value === opt.value ? "report-tab active" : "report-tab"}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
