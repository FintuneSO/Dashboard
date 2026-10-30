const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 18 18",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};
export function IconSchemeMaster(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="2.5" width="13" height="13" rx="2" />
      <path d="M2.5 7h13M7 2.5v13" />
    </svg>
  );
}
export function IconIndustry(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 15.5V7l4-2.5V15.5M6.5 15.5V3l4.5-1v13.5M11 15.5V6l4.5 1.5v8" />
      <path d="M2.5 15.5h13" />
    </svg>
  );
}
export function IconAmc(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="12" height="12" rx="6" />
      <path
        d="M9 3a6 6 0 0 1 0 12"
        fill="currentColor"
        stroke="none"
        opacity="0.25"
      />
    </svg>
  );
}
export function IconCategory(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1" />
      <rect x="10" y="2.5" width="5.5" height="5.5" rx="1" />
      <rect x="2.5" y="10" width="5.5" height="5.5" rx="1" />
      <rect x="10" y="10" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}
export function IconScheme(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 13.5l3.5-5 3 3 6-7" />
      <path d="M12 4.5h3v3" />
    </svg>
  );
}
export function IconSun(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="9" r="3.4" />
      <path d="M9 1.8v2M9 14.2v2M16.2 9h-2M3.8 9h-2M14.1 3.9l-1.4 1.4M5.3 12.7l-1.4 1.4M14.1 14.1l-1.4-1.4M5.3 5.3L3.9 3.9" />
    </svg>
  );
}
export function IconMoon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 10.8A6 6 0 1 1 7.2 3.5a5 5 0 0 0 7.3 7.3z" />
    </svg>
  );
}
