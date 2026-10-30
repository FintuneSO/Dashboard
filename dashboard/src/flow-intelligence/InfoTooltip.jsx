import { useState, useRef } from "react";
import { createPortal } from "react-dom";
export default function InfoTooltip({ children }) {
  const [coords, setCoords] = useState(null);
  const iconRef = useRef(null);
  const handleEnter = () => {
    const r = iconRef.current.getBoundingClientRect();
    setCoords({
      top: r.top,
      left: r.left + r.width / 2,
    });
  };
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        verticalAlign: "middle",
        marginLeft: 4,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setCoords(null)}
    >
      <span
        ref={iconRef}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 13,
          height: 13,
          borderRadius: "50%",
          fontSize: 9.5,
          fontWeight: 700,
          color: "var(--text-faint)",
          border: "1px solid var(--border-strong)",
          cursor: "default",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        ?
      </span>
      {coords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.top - 8,
              left: coords.left,
              transform: "translate(-50%, -100%)",
              width: 220,
              zIndex: 1000,
              fontWeight: 400,
              textAlign: "left",
              fontSize: 11.5,
              lineHeight: 1.45,
              color: "var(--text)",
              pointerEvents: "none",
              whiteSpace: "normal",
              textTransform: "none",
              padding: "10px 13px",
              borderRadius: "var(--radius-sm)",
              background: "var(--panel)",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px var(--border-strong)",
              isolation: "isolate",
            }}
          >
            {children}
          </div>,
          document.querySelector(".fi-root") || document.body,
        )}
    </span>
  );
}
