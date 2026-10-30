import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import "./theme.css";
import { fetchLatestDate } from "./api";
import {
  IconSchemeMaster,
  IconIndustry,
  IconAmc,
  IconCategory,
  IconScheme,
  IconSun,
  IconMoon,
} from "./icons";
const NAV_ITEMS = [
  {
    to: "/flow-intelligence",
    label: "Industry",
    Icon: IconIndustry,
    end: true,
  },
  {
    to: "/flow-intelligence/amc",
    label: "AMC",
    Icon: IconAmc,
  },
  {
    to: "/flow-intelligence/category",
    label: "Category",
    Icon: IconCategory,
  },
  {
    to: "/flow-intelligence/scheme",
    label: "Scheme",
    Icon: IconScheme,
  },
];
function useThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("fi-theme") || "light",
  );
  useEffect(() => {
    try {
      localStorage.setItem("fi-theme", theme);
    } catch {}
  }, [theme]);
  return [theme, setTheme];
}
function Breadcrumb() {
  const location = useLocation();
  const parts = location.pathname
    .replace("/flow-intelligence", "")
    .split("/")
    .filter(Boolean);
  if (parts.length === 0)
    return (
      <div className="fi-breadcrumb">
        <b>Industry Overview</b>
      </div>
    );
  return (
    <div className="fi-breadcrumb">
      <span>Industry</span>
      {parts.map((p, i) => (
        <span key={i}>
          {" "}
          / <b>{p}</b>
        </span>
      ))}
    </div>
  );
}
function fmtAsOfDate(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export default function FlowIntelligenceShell() {
  const [theme, setTheme] = useThemeToggle();
  const [asOfDate, setAsOfDate] = useState(null);
  useEffect(() => {
    fetchLatestDate()
      .then(setAsOfDate)
      .catch(() => {});
  }, []);
  return (
    <div className="fi-root" data-fi-theme={theme}>
      <div className="fi-shell">
        <nav className="fi-rail">
          <a
            href="/"
            className="fi-rail-item"
            title="Scheme Master"
            style={{
              marginBottom: 6,
            }}
          >
            <IconSchemeMaster />
          </a>
          <div className="fi-rail-logo">FI</div>
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `fi-rail-item${isActive ? " active" : ""}`
              }
            >
              <Icon />
              <span className="fi-rail-label">{label}</span>
            </NavLink>
          ))}
          <div className="fi-rail-spacer" />
        </nav>

        <div className="fi-main">
          <div className="fi-topbar">
            <Breadcrumb />
            <div className="fi-topbar-right">
              {asOfDate && (
                <span
                  className="fi-dim"
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--mono)",
                  }}
                  title="Most recent date our data covers — all numbers on this page are as of this date"
                >
                  As of {fmtAsOfDate(asOfDate)}
                </span>
              )}
              <button
                className="fi-theme-toggle"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Toggle theme"
              >
                {theme === "dark" ? (
                  <IconMoon width={14} height={14} />
                ) : (
                  <IconSun width={14} height={14} />
                )}
              </button>
            </div>
          </div>
          <div className="fi-body">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
