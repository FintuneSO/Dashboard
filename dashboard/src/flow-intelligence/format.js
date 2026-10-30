export function fmtCr(n) {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n).toLocaleString("en-IN")} Cr`;
}
export function fmtCrTable(n) {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n).toLocaleString("en-IN")} Cr`;
}
export function fmtPct(n, digits = 2) {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
export function fmtRatioPct(n, digits = 2) {
  if (n === null || n === undefined) return "—";
  return fmtPct(n * 100, digits);
}
export function signClass(n) {
  if (n === null || n === undefined) return "fi-faint";
  return n > 0 ? "fi-pos" : n < 0 ? "fi-neg" : "fi-dim";
}
export function chartColor(i) {
  return `var(--chart-${(i % 10) + 1})`;
}
export function median(arr) {
  const vals = arr.filter((v) => v !== null && v !== undefined);
  if (!vals.length) return null;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
export function hhi(values) {
  const total = values.reduce((s, v) => s + Number(v || 0), 0);
  if (!total) return null;
  return values.reduce(
    (s, v) => s + Math.pow((Number(v || 0) / total) * 100, 2),
    0,
  );
}
export function hhiBand(score) {
  if (score === null || score === undefined) return "—";
  if (score < 1500) return "Unconcentrated";
  if (score < 2500) return "Moderately concentrated";
  return "Highly concentrated";
}
