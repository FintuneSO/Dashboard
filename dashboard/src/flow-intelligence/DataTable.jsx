import { useState } from "react";
export function useSort(initialKey, initialDir = "desc") {
  const [key, setKey] = useState(initialKey);
  const [dir, setDir] = useState(initialDir);
  const onSort = (k) => {
    if (k === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setKey(k);
      setDir("desc");
    }
  };
  return {
    key,
    dir,
    onSort,
  };
}
export function sortRows(rows, key, dir) {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const av = a[key],
      bv = b[key];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (av === bv) return 0;
    return dir === "asc" ? av - bv : bv - av;
  });
}
export function SortTh({ label, sortKey, sort, align = "right" }) {
  const active = sort.key === sortKey;
  return (
    <th
      onClick={() => sort.onSort(sortKey)}
      style={{
        textAlign: align,
      }}
    >
      {label}
      {active ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}
