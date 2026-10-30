import { useEffect, useState } from "react";
import { fetchLatestDate } from "./api";
export function useLatestDate() {
  const [latestDate, setLatestDate] = useState(null);
  useEffect(() => {
    fetchLatestDate()
      .then(setLatestDate)
      .catch(() => {});
  }, []);
  return latestDate;
}
