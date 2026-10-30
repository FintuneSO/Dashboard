const API_BASE = "http://localhost:8000";
function addReportParam(params, report) {
  if (report) params.set("report", report);
}
export async function fetchCategorySales(date, fundHouse, report) {
  const params = new URLSearchParams({
    date,
  });
  if (fundHouse && fundHouse !== "All") {
    params.set("fund_house", fundHouse);
  }
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/categories/sales?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.categories.map((row) => ({
    category: row.category,
    "1d": row.sales_1d,
    "3d": row.sales_3d,
    "7d": row.sales_7d,
    "14d": row.sales_14d,
    "30d": row.sales_30d,
    mtd: row.sales_mtd,
  }));
}
export function getCategorySalesExportUrl(date, fundHouse, report) {
  const params = new URLSearchParams({
    date,
  });
  if (fundHouse && fundHouse !== "All") {
    params.set("fund_house", fundHouse);
  }
  addReportParam(params, report);
  return `${API_BASE}/categories/sales/export?${params}`;
}
export async function fetchTopPlayers(date, fundHouse, report) {
  const params = new URLSearchParams({
    date,
  });
  if (fundHouse && fundHouse !== "All") {
    params.set("fund_house", fundHouse);
  }
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/top-players?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.rows;
}
export function getTopPlayersExportUrl(date, fundHouse, report) {
  const params = new URLSearchParams({
    date,
  });
  if (fundHouse && fundHouse !== "All") {
    params.set("fund_house", fundHouse);
  }
  addReportParam(params, report);
  return `${API_BASE}/top-players/export?${params}`;
}
export async function fetchTopSchemes(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/top-schemes?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
export function getTopSchemesExportUrl(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  return `${API_BASE}/top-schemes/export?${params}`;
}
export async function fetchCategorywise(date, fundHouse, report) {
  const params = new URLSearchParams({
    date,
    fund_house: fundHouse,
  });
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/categorywise?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.rows;
}
export function getCategorywiseExportUrl(date, fundHouse, report) {
  const params = new URLSearchParams({
    date,
    fund_house: fundHouse,
  });
  addReportParam(params, report);
  return `${API_BASE}/categorywise/export?${params}`;
}
export async function fetchRollingWeekly(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/rolling-weekly?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
export function getRollingWeeklyExportUrl(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  return `${API_BASE}/rolling-weekly/export?${params}`;
}
export async function fetchConsolidated(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/consolidated?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
export function getConsolidatedExportUrl(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  return `${API_BASE}/consolidated/export?${params}`;
}
export async function fetchNavRegular(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/nav-regular?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.rows;
}
export function getNavRegularExportUrl(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  return `${API_BASE}/nav-regular/export?${params}`;
}
export async function fetchNavDirect(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/nav-direct?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.rows;
}
export function getNavDirectExportUrl(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  return `${API_BASE}/nav-direct/export?${params}`;
}
export async function fetchAum(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  const res = await fetch(`${API_BASE}/aum?${params}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.rows;
}
export function getAumExportUrl(date, report) {
  const params = new URLSearchParams({
    date,
  });
  addReportParam(params, report);
  return `${API_BASE}/aum/export?${params}`;
}
export async function fetchLatestDate() {
  const res = await fetch(`${API_BASE}/latest-date`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.latest_date;
}
export async function fetchFundHouses() {
  const res = await fetch(`${API_BASE}/fund-houses`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.fund_houses;
}
