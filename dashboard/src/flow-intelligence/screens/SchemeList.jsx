import { useEffect, useState } from "react";
import { fetchSchemeList, fetchLatestDate } from "../api";
import SchemeTable from "../SchemeTable";
import SchemeUniversePanel from "../SchemeUniversePanel";
export default function SchemeList() {
  const [date, setDate] = useState(null);
  const [schemes, setSchemes] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchLatestDate()
      .then(setDate)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!date) return;
    const handle = setTimeout(() => {
      fetchSchemeList(date, query.trim() || undefined)
        .then((r) => setSchemes(r.schemes))
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(handle);
  }, [date, query]);
  if (error)
    return (
      <div className="fi-panel fi-panel-pad fi-neg">
        Failed to load: {error}
      </div>
    );
  return (
    <>
      <div className="fi-panel fi-panel-pad">
        <div className="fi-section-title">All Schemes</div>
        <div
          className="fi-section-subtitle"
          style={{
            marginBottom: 10,
          }}
        >
          Search by scheme name, or browse the top 500 by AUM with no search
          term.
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search scheme name…"
          style={{
            width: "100%",
            maxWidth: 420,
            background: "var(--panel-sunken)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "7px 11px",
            fontSize: 12.5,
            fontFamily: "var(--sans)",
          }}
        />
      </div>

      {!schemes ? (
        <div
          className="fi-panel fi-panel-pad fi-dim"
          style={{
            fontSize: 12,
          }}
        >
          Loading…
        </div>
      ) : (
        <>
          {!query && <SchemeUniversePanel schemes={schemes} />}
          <SchemeTable
            schemes={schemes}
            title={query ? `Results for "${query}"` : "Top Schemes by AUM"}
            subtitle={`${schemes.length} scheme${schemes.length === 1 ? "" : "s"}${!query ? " (top 500 by AUM)" : ""}`}
          />
        </>
      )}
    </>
  );
}
