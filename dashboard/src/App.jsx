import { useState } from "react";
import TopCategoriesPivot from "./TopCategoriesPivot";
import TopPlayers from "./TopPlayers";
import TopSchemes from "./TopSchemes";
import Categorywise from "./Categorywise";
import RollingWeekly from "./RollingWeekly";
import Consolidated from "./Consolidated";
import NavRegular from "./NavRegular";
import NavDirect from "./NavDirect";
import Aum from "./Aum";
import "./App.css";
const PAGES = {
  "categories-pivot": {
    label: "Top Categories Pivot",
    Component: TopCategoriesPivot,
  },
  "top-players": {
    label: "Top Players",
    Component: TopPlayers,
  },
  "top-schemes": {
    label: "Top Schemes",
    Component: TopSchemes,
  },
  categorywise: {
    label: "Categorywise",
    Component: Categorywise,
  },
  "rolling-weekly": {
    label: "Rolling Weekly",
    Component: RollingWeekly,
  },
  consolidated: {
    label: "Consolidated",
    Component: Consolidated,
  },
  "nav-reg": {
    label: "NAV Reg",
    Component: NavRegular,
  },
  "nav-direct": {
    label: "NAV Direct",
    Component: NavDirect,
  },
  aum: {
    label: "AUM",
    Component: Aum,
  },
};
function App() {
  const [page, setPage] = useState("categories-pivot");
  const { Component } = PAGES[page];
  return (
    <div className="app-root">
      <nav className="app-rail">
        <div className="app-rail-item active" title="Scheme Master">
          SM
        </div>
        <a
          className="app-rail-item"
          href="/flow-intelligence"
          title="Flow Intelligence"
        >
          FI
        </a>
      </nav>
      <div className="app-shell">
        <nav className="top-nav">
          <div className="top-nav-inner">
            <span className="top-nav-brand">Scheme Master</span>
            <div className="top-nav-links">
              {Object.entries(PAGES).map(([key, { label }]) => (
                <a
                  key={key}
                  href="#"
                  className={
                    page === key ? "top-nav-link active" : "top-nav-link"
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(key);
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </nav>
        <Component />
      </div>
    </div>
  );
}
export default App;
