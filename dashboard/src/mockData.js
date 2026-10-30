export const CATEGORIES = [
  "Aggressive Hybrid",
  "Arbitrage",
  "Balanced Hybrid",
  "Banking and PSU",
  "Children's",
  "Conservative Hybrid",
  "Contra / Value",
  "Corporate Bond",
  "Credit Risk",
  "Dividend Yield",
  "Dynamic Asset Allocation or Balanced Advantage",
  "Dynamic Bond",
  "ELSS",
  "Equity Savings",
  "Flexi Cap",
  "Floater",
  "Focused",
  "FoFs (Overseas/Domestic)",
  "Gilt",
  "Gilt with 10 year constant duration",
  "Index Funds/ ETFs",
  "Large & Midcap",
  "Large Cap",
  "Liquid",
  "Long Duration",
  "Low Duration",
  "Medium Duration",
  "Medium to Long Duration",
  "Midcap",
  "Money Market",
  "Multi Asset Allocation",
  "Multicap",
  "Overnight",
  "Retirement",
  "Sectoral / Thematic",
  "Short Duration",
];
export const FUND_HOUSES = [
  "360 ONE",
  "Aditya Birla Sun Life",
  "Axis",
  "Bajaj Finserv",
  "Bandhan",
  "Bank of India",
  "Baroda BNP Paribas",
  "Canara Robeco",
  "DSP",
  "Edelweiss",
  "Franklin India",
  "Groww",
  "HDFC",
  "HSBC",
  "ICICI Prudential",
  "Invesco India",
  "ITI",
  "JioBlackRock",
  "JM",
  "Kotak",
  "LIC MF",
  "Mahindra Manulife",
  "Mirae Asset",
  "Motilal Oswal",
  "Nippon India",
  "Parag Parikh",
  "PGIM India",
  "Quant",
  "Samco",
  "SBI",
  "Sundaram",
  "Tata",
  "Taurus",
  "Union",
  "UTI",
  "WhiteOak Capital",
  "Zerodha",
];
const WINDOWS = ["1d", "3d", "7d", "14d", "30d", "mtd"];
function seededValue(seed, scale) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const normalized = ((h % 20000) - 10000) / 10000;
  return Math.round(normalized * scale * 100) / 100;
}
export function getMockCategoryRows(fundHouse) {
  const scale = fundHouse === "All" ? 3000 : 400;
  return CATEGORIES.map((category) => {
    const row = {
      category,
    };
    WINDOWS.forEach((w, i) => {
      const windowScale = scale * (1 + i * 0.6);
      row[w] = seededValue(category + fundHouse + w, windowScale);
    });
    return row;
  });
}
export const WINDOW_LABELS = {
  "1d": "Sum of 1 day Sales",
  "3d": "Sum of 3 day Sales",
  "7d": "Sum of 7 day Sales",
  "14d": "Sum of 14 day Sales",
  "30d": "Sum of 30 day Sales",
  mtd: "Sum of MTD Sales",
};
