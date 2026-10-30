const ROOT = "http://localhost:8000";
const BASE = `${ROOT}/flow-intelligence`;
async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}
export const fetchDirectory = () => get("/directory");
export const fetchIndustry = (date) =>
  get("/industry", {
    date,
  });
export const fetchIndustrySummary = (date) =>
  get("/industry/summary", {
    date,
  });
export const fetchIndustrySeries = (startDate, endDate) =>
  get("/industry/series", {
    start_date: startDate,
    end_date: endDate,
  });
export const fetchDirectRegularGap = (date) =>
  get("/industry/direct-regular-gap", {
    date,
  });
export const fetchAmcPanel = (date, subcategoryId) =>
  get(
    "/industry/amc-panel",
    subcategoryId
      ? {
          date,
          subcategory_id: subcategoryId,
        }
      : {
          date,
        },
  );
export const fetchAssetClassDetail = (name, date) =>
  get(`/asset-class/${encodeURIComponent(name)}`, {
    date,
  });
export const fetchAssetClassSeries = (name, startDate, endDate) =>
  get(`/asset-class/${encodeURIComponent(name)}/series`, {
    start_date: startDate,
    end_date: endDate,
  });
export const fetchAmcList = (date) =>
  get("/amc", {
    date,
  });
export const fetchAmcUniverseStats = (date) =>
  get("/amc/universe-stats", {
    date,
  });
export const fetchAmcDetail = (id, date) =>
  get(`/amc/${id}`, {
    date,
  });
export const fetchAmcSeries = (id, startDate, endDate) =>
  get(`/amc/${id}/series`, {
    start_date: startDate,
    end_date: endDate,
  });
export const fetchAmcWindowSummary = (id, date) =>
  get(`/amc/${id}/window-summary`, {
    date,
  });
export const fetchCategoryList = (date) =>
  get("/category", {
    date,
  });
export const fetchCategoryUniverseStats = (date) =>
  get("/category/universe-stats", {
    date,
  });
export const fetchCategoryDetail = (id, date) =>
  get(`/category/${id}`, {
    date,
  });
export const fetchCategorySeries = (id, startDate, endDate) =>
  get(`/category/${id}/series`, {
    start_date: startDate,
    end_date: endDate,
  });
export const fetchCategoryOutlierSeries = (id, date) =>
  get(`/category/${id}/outlier-series`, {
    date,
  });
export const fetchSchemeList = (date, q) =>
  get(
    "/scheme",
    q
      ? {
          date,
          q,
        }
      : {
          date,
        },
  );
export const fetchSchemeDetail = (id, date) =>
  get(`/scheme/${id}`, {
    date,
  });
export const fetchSchemeNavSeries = (id, startDate, endDate) =>
  get(`/scheme/${id}/nav-series`, {
    start_date: startDate,
    end_date: endDate,
  });
export const fetchSchemeOutlierSeries = (id, date) =>
  get(`/scheme/${id}/outlier-series`, {
    date,
  });
export const fetchSchemePeerScatter = (id, date) =>
  get(`/scheme/${id}/peer-scatter`, {
    date,
  });
export async function fetchLatestDate() {
  const res = await fetch(`${ROOT}/latest-date`);
  if (!res.ok) throw new Error("latest-date failed");
  const { latest_date } = await res.json();
  return latest_date;
}
