import React from "react";
import { TITLE_META, PROGRESSION_RANK_META, type ProgressionRankKey } from "@/lib/gamification";

/* ──────────────────────────────────────────────────────────────
   Visual ring config per PROGRESSION RANK key
   (bronze | silver | gold | diamond | elite)
   ──────────────────────────────────────────────────────────────*/
interface RankCfg {
  ringBg:       string;
  glowColor:    string;
  avatarBg:     string;
  avatarText:   string;
  pad:          number;
  spin:         boolean;
  spinClass?:   string;
  spinRevClass?:string;
  showIcon:     boolean;
  hasSparkles:  boolean;
  sparkleColor: string;
  glowAnim:     string;
}

const PROGRESSION_CFG: Record<string, RankCfg> = {
  /* Bronze 🥉 — warm copper, solid */
  bronze: {
    ringBg:       "linear-gradient(135deg, #CD7F32, #A0522D, #E8A870, #CD7F32)",
    glowColor:    "rgba(205,127,50,0.22)",
    avatarBg:     "linear-gradient(135deg, #E8A870, #CD7F32)",
    avatarText:   "#fff",
    pad:          2.5,
    spin:         false,
    showIcon:     false,
    hasSparkles:  false,
    sparkleColor: "#E8A870",
    glowAnim:     "",
  },
  /* Silver 🥈 — cool silver shimmer */
  silver: {
    ringBg:       "linear-gradient(135deg, #C0C0C0, #E8E8E8, #A8A9AD, #D4D4D4)",
    glowColor:    "rgba(168,169,173,0.30)",
    avatarBg:     "linear-gradient(135deg, #D4D4D4, #A8A9AD)",
    avatarText:   "#3D3D3D",
    pad:          2.5,
    spin:         false,
    showIcon:     false,
    hasSparkles:  false,
    sparkleColor: "#E8E8E8",
    glowAnim:     "mdn-halo-2",
  },
  /* Gold 🥇 — warm gold, sparkles, no spin */
  gold: {
    ringBg:       "linear-gradient(135deg, #FEF08A, #FBBF24, #F59E0B, #FCD34D)",
    glowColor:    "rgba(245,158,11,0.45)",
    avatarBg:     "linear-gradient(135deg, #FBBF24, #F59E0B)",
    avatarText:   "#fff",
    pad:          3,
    spin:         false,
    showIcon:     true,
    hasSparkles:  true,
    sparkleColor: "#FDE68A",
    glowAnim:     "mdn-halo-3",
  },
  /* Diamond 💎 — ice blue conic, sparkles, no spin */
  diamond: {
    ringBg:       "conic-gradient(from 30deg, #BAE6FD, #38BDF8, #7DD3FC, #E0F2FE, #38BDF8, #BAE6FD)",
    glowColor:    "rgba(56,189,248,0.55)",
    avatarBg:     "linear-gradient(135deg, #38BDF8, #0EA5E9)",
    avatarText:   "#fff",
    pad:          3.5,
    spin:         false,
    showIcon:     true,
    hasSparkles:  true,
    sparkleColor: "#BAE6FD",
    glowAnim:     "mdn-halo-4",
  },
  /* Elite 👑 — purple-gold conic, crown + sparkles, no spin */
  elite: {
    ringBg:       "conic-gradient(from 60deg, #C084FC, #FCD34D, #E879F9, #FBBF24, #C084FC)",
    glowColor:    "rgba(192,132,252,0.65)",
    avatarBg:     "linear-gradient(135deg, #C084FC, #E879F9)",
    avatarText:   "#fff",
    pad:          3.5,
    spin:         false,
    showIcon:     true,
    hasSparkles:  true,
    sparkleColor: "#FCD34D",
    glowAnim:     "mdn-halo-5",
  },
};

const DEFAULT_CFG = PROGRESSION_CFG["bronze"]!;

/* ──────────────────────────────────────────────────────────────
   Sub-elements
   ──────────────────────────────────────────────────────────────*/
function SparkleRing({ color, count, radius }: { color: string; count: number; radius: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (360 / count) * i;
        const rad = (angle * Math.PI) / 180;
        const x = radius * Math.cos(rad - Math.PI / 2);
        const y = radius * Math.sin(rad - Math.PI / 2);
        return (
          <span
            key={i}
            className="mdn-sparkle"
            style={{
              position: "absolute",
              width: 4, height: 4, borderRadius: "50%",
              background: color,
              boxShadow: `0 0 5px 1px ${color}`,
              left: `calc(50% + ${x}px - 2px)`,
              top:  `calc(50% + ${y}px - 2px)`,
              animationDelay: `${(i * 0.4).toFixed(1)}s`,
              animationDuration: "2.8s",
            }}
          />
        );
      })}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
   LevelAvatar — ring driven by progressionRank
   ──────────────────────────────────────────────────────────────*/
export interface LevelAvatarProps {
  name:            string;
  /** Progression rank key: "bronze" | "silver" | "gold" | "diamond" | "elite" */
  progressionRank: string;
  size?:           "xs" | "sm" | "md" | "lg";
  className?:      string;
  style?:          React.CSSProperties;
}

const SIZE_MAP = { xs: 26, sm: 32, md: 44, lg: 58 };
const FONT_MAP = { xs: 9,  sm: 12, md: 16, lg: 22 };
const ICON_MAP = { xs: 9,  sm: 11, md: 13, lg: 16 };

export function LevelAvatar({ name, progressionRank, size = "md", className = "", style }: LevelAvatarProps) {
  const cfg      = PROGRESSION_CFG[progressionRank] ?? DEFAULT_CFG;
  const meta     = PROGRESSION_RANK_META[progressionRank as ProgressionRankKey];
  const avatarSz = SIZE_MAP[size];
  const fontSize = FONT_MAP[size];
  const iconSz   = ICON_MAP[size];
  const pad      = cfg.pad;
  const outerSz  = avatarSz + pad * 2;
  const initial  = name?.charAt(0)?.toUpperCase() ?? "?";

  const spinClass    = cfg.spin ? (cfg.spinClass    ?? "") : "";
  const spinRevClass = cfg.spin ? (cfg.spinRevClass ?? "") : "";

  const haloEl = cfg.glowAnim ? (
    <span
      className={cfg.glowAnim}
      style={{
        position: "absolute", inset: -5, borderRadius: "50%",
        background: cfg.glowColor, filter: "blur(7px)",
        zIndex: 0, pointerEvents: "none",
      }}
    />
  ) : null;

  const ringEl = (
    <div
      className={`${spinClass} mdn-rank-hover`}
      style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: cfg.ringBg, zIndex: 1,
      }}
    />
  );

  const avatarEl = (
    <div
      className={spinRevClass}
      style={{
        position: "absolute", inset: pad, borderRadius: "50%",
        background: cfg.avatarBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2, fontWeight: 900, fontSize,
        color: cfg.avatarText, letterSpacing: "-0.02em",
        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.25)",
      }}
    >
      {initial}
    </div>
  );

  const iconEl = cfg.showIcon && size !== "xs" && meta ? (
    <span
      className="mdn-crown"
      style={{
        position: "absolute",
        top: -(iconSz * 1.05),
        left: "50%", transform: "translateX(-50%)",
        fontSize: iconSz, zIndex: 5, lineHeight: 1,
        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.20))",
      }}
    >
      {meta.icon}
    </span>
  ) : null;

  const sparklesEl = cfg.hasSparkles && size !== "xs" ? (
    <SparkleRing
      color={cfg.sparkleColor}
      count={progressionRank === "elite" || progressionRank === "diamond" ? 6 : 4}
      radius={outerSz / 2 + 3}
    />
  ) : null;

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`} style={style}>
      <div style={{ position: "relative", width: outerSz, height: outerSz, flexShrink: 0 }}>
        {haloEl}
        {ringEl}
        {avatarEl}
        {iconEl}
        {sparklesEl}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   TitleBadge — two-line badge: English title + Arabic description
   Shown under username to represent community identity.
   ──────────────────────────────────────────────────────────────*/
export function TitleBadge({ titleKey }: { titleKey: string }) {
  const meta = TITLE_META[titleKey];
  if (!meta) return null;

  const isPremium = titleKey === "top_ranked" || titleKey === "batch_legend";
  const premiumBg = titleKey === "top_ranked"
    ? "linear-gradient(135deg, #C084FC, #E879F9)"
    : "linear-gradient(135deg, #FBBF24, #F59E0B)";

  return (
    <span
      style={{
        display:       "inline-flex",
        flexDirection: "column",
        alignItems:    "flex-start",
        padding:       "2px 8px 3px",
        borderRadius:  8,
        background:    isPremium ? premiumBg : `${meta.color}16`,
        border:        `1px solid ${meta.color}38`,
        gap:           1,
        minWidth:      0,
      }}
    >
      <span style={{
        display: "flex", alignItems: "center", gap: 3,
        fontSize: 10, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap",
        color: isPremium ? "#fff" : meta.color,
      }}>
        <span style={{ fontSize: 10 }}>{meta.icon}</span>
        {meta.title}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 400, lineHeight: 1.2,
        direction: "rtl", whiteSpace: "nowrap",
        color: isPremium ? "rgba(255,255,255,0.75)" : `${meta.color}99`,
      }}>
        {meta.titleAr}
      </span>
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   TitlePill — compact single-line pill (icon + English title)
   Used when space is very tight or for inline mentions.
   ──────────────────────────────────────────────────────────────*/
export function TitlePill({ titleKey }: { titleKey: string }) {
  const meta = TITLE_META[titleKey];
  if (!meta) return null;

  const isPremium = titleKey === "top_ranked" || titleKey === "batch_legend";
  const premiumBg = titleKey === "top_ranked"
    ? "linear-gradient(135deg, #C084FC, #E879F9)"
    : "linear-gradient(135deg, #FBBF24, #F59E0B)";

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "2px 7px", borderRadius: 99,
        fontSize: 10, fontWeight: 700, letterSpacing: "0.01em", whiteSpace: "nowrap",
        background: isPremium ? premiumBg : `${meta.color}16`,
        border: `1px solid ${meta.color}38`,
        color: isPremium ? "#fff" : meta.color,
      }}
    >
      <span style={{ fontSize: 10 }}>{meta.icon}</span>
      {meta.title}
    </span>
  );
}

/* ── Legacy aliases — keep existing call sites compiling ─────── */
/** @deprecated use TitleBadge */
export function RankBadge({ rankKey }: { rankKey: string }) {
  return <TitleBadge titleKey={rankKey} />;
}
/** @deprecated use TitlePill */
export function RankPill({ rankKey }: { rankKey: string }) {
  return <TitlePill titleKey={rankKey} />;
}
