import React from "react";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const defaults: React.SVGProps<SVGSVGElement> = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ───── General ───── */

export const IconLightning = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const IconRobot = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <line x1="12" y1="7" x2="12" y2="11" />
    <line x1="8" y1="16" x2="8" y2="16.01" />
    <line x1="16" y1="16" x2="16" y2="16.01" />
  </svg>
);

export const IconPalette = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <circle cx="13.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="10.5" r="1.5" />
    <circle cx="8.5" cy="7.5" r="1.5" />
    <circle cx="6.5" cy="12" r="1.5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.38-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.01 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-9-10-9z" />
  </svg>
);

export const IconBarChart = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const IconShield = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const IconTrophy = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export const IconHeart = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style} fill="currentColor" stroke="none">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

/* ───── Tech Stack ───── */

export const IconAtom = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <circle cx="12" cy="12" r="1" />
    <ellipse cx="12" cy="12" rx="10" ry="4" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
  </svg>
);

export const IconTerminal = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

export const IconContainer = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const IconDatabase = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

export const IconWrench = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const IconLock = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconGlobe = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

/* ───── Theme Icons ───── */

export const IconMoon = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const IconSun = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const IconFlame = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3-7 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.5-2.5 1.5-3.5l1 1z" />
  </svg>
);

export const IconBat = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M2 12c2-3 5-5 10-5s8 2 10 5c-2-1-4-1.5-6-1-1.5.5-2.5 2-4 2s-2.5-1.5-4-2c-2-.5-4 0-6 1z" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    <path d="M12 14v2" />
  </svg>
);

export const IconSnowflake = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="4.93" y1="7.5" x2="19.07" y2="16.5" />
    <line x1="19.07" y1="7.5" x2="4.93" y2="16.5" />
    <line x1="9" y1="3.5" x2="12" y2="6" />
    <line x1="15" y1="3.5" x2="12" y2="6" />
    <line x1="9" y1="20.5" x2="12" y2="18" />
    <line x1="15" y1="20.5" x2="12" y2="18" />
    <line x1="3.5" y1="9" x2="6.5" y2="10" />
    <line x1="3.5" y1="15" x2="6.5" y2="14" />
    <line x1="20.5" y1="9" x2="17.5" y2="10" />
    <line x1="20.5" y1="15" x2="17.5" y2="14" />
  </svg>
);

/* ───── Badges & General ───── */

export const IconFlag = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

export const IconBrain = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M9.5 2A5.5 5.5 0 0 0 5 7.5c0 1.58.7 3 1.8 3.98L7 12h4V7.5A2.5 2.5 0 0 0 9.5 5 2.5 2.5 0 0 0 7 7.5" />
    <path d="M14.5 2A5.5 5.5 0 0 1 19 7.5c0 1.58-.7 3-1.8 3.98L17 12h-4V7.5A2.5 2.5 0 0 1 14.5 5 2.5 2.5 0 0 1 17 7.5" />
    <path d="M7 12v5.5a4.5 4.5 0 0 0 5 4.5 4.5 4.5 0 0 0 5-4.5V12" />
    <line x1="12" y1="12" x2="12" y2="22" />
  </svg>
);

export const IconDiamond = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <polygon points="12 2 2 12 12 22 22 12" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2l4 10-4 10-4-10z" />
  </svg>
);

export const IconSearch = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconClipboard = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

export const IconCompass = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export const IconRocket = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

export const IconCalendar = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const IconCode = ({ className, style }: IconProps) => (
  <svg {...defaults} className={className} style={style}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);
