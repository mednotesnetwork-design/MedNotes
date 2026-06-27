import React from "react";
import type { ProgressionRankKey } from "@/lib/gamification";

/* ── RankBadgePill ─────────────────────────────────────────── */
const RANK_LABELS: Record<ProgressionRankKey, string> = {
  beginner: "مبتدئ",
  bronze:   "برونزي",
  silver:   "فضي",
  gold:     "ذهبي",
  platinum: "بلاتينيوم",
  diamond:  "دايموند",
  master:   "ماستر",
};
const RANK_COLORS: Record<ProgressionRankKey, { bg: string; text: string; border: string }> = {
  beginner: { bg: "rgba(78,138,89,0.12)",   text: "#2D6E3A", border: "rgba(78,138,89,0.22)" },
  bronze:   { bg: "rgba(180,100,30,0.14)",  text: "#8A4810", border: "rgba(180,100,30,0.28)" },
  silver:   { bg: "rgba(130,160,180,0.14)", text: "#4A6878", border: "rgba(130,160,180,0.28)" },
  gold:     { bg: "rgba(240,185,0,0.14)",   text: "#8A6200", border: "rgba(240,185,0,0.30)" },
  platinum: { bg: "rgba(80,160,220,0.14)",  text: "#1A5A9A", border: "rgba(80,160,220,0.28)" },
  diamond:  { bg: "rgba(150,70,220,0.14)",  text: "#6020A0", border: "rgba(150,70,220,0.28)" },
  master:   { bg: "rgba(240,185,0,0.16)",   text: "#7A4800", border: "rgba(240,185,0,0.35)" },
};
const RANK_ICONS: Record<ProgressionRankKey, string> = {
  beginner: "🌱", bronze: "🥉", silver: "🥈", gold: "🥇",
  platinum: "💠", diamond: "💎", master: "👑",
};

export function RankBadgePill({
  rank,
  size = "sm",
}: {
  rank:  ProgressionRankKey;
  size?: "xs" | "sm" | "md";
}) {
  const c  = RANK_COLORS[rank];
  const fs = size === "xs" ? 9 : size === "sm" ? 10 : 12;
  const px = size === "xs" ? "5px 9px" : size === "sm" ? "3px 9px" : "4px 12px";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: fs, fontWeight: 700,
      padding: px, borderRadius: 99,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: fs + 1 }}>{RANK_ICONS[rank]}</span>
      {RANK_LABELS[rank]}
    </span>
  );
}

/* ── Frame image sources (served from /public/frames/) ─────── */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type FramedRank = Exclude<ProgressionRankKey, "beginner">;

const FRAME_SRC: Record<FramedRank, string> = {
  bronze:   `${BASE}/frames/bronze.png`,
  silver:   `${BASE}/frames/silver.png`,
  gold:     `${BASE}/frames/gold.png`,
  platinum: `${BASE}/frames/platinum.png`,
  diamond:  `${BASE}/frames/diamond.png`,
  master:   `${BASE}/frames/master.png`,
};

/* ── Avatar background gradient per rank ───────────────────── */
const AV_GRAD: Record<ProgressionRankKey, [string, string]> = {
  beginner: ["hsl(130 45% 38%)", "hsl(130 45% 18%)"],
  bronze:   ["hsl(24  65% 40%)", "hsl(24  65% 20%)"],
  silver:   ["hsl(210 18% 50%)", "hsl(210 18% 30%)"],
  gold:     ["hsl(42  80% 46%)", "hsl(42  80% 26%)"],
  platinum: ["hsl(200 55% 46%)", "hsl(200 55% 26%)"],
  diamond:  ["hsl(270 55% 40%)", "hsl(270 55% 20%)"],
  master:   ["hsl(38  88% 44%)", "hsl(38  88% 24%)"],
};

/*
  RankFrame — wreath PNG frame over an avatar circle.
  Render order (back → front):
    1. Avatar circle (initials + gradient, sits in the centre hole)
    2. Frame PNG     (wreath image, transparent centre = avatar shows through)
*/
export function RankFrame({
  name,
  rank,
  size = 100,
}: {
  name:  string;
  rank:  ProgressionRankKey;
  size?: number;
}) {
  const ini   = (name ?? "?").charAt(0).toUpperCase();
  const [c1, c2] = AV_GRAD[rank];
  const avDiam = Math.round(size * 0.65);

  return (
    <div
      style={{
        width:     size,
        height:    size,
        position:  "relative",
        flexShrink: 0,
      }}
    >
      {/* ── 1. Avatar circle ── */}
      <div
        style={{
          position:     "absolute",
          top:          "50%",
          left:         "50%",
          transform:    "translate(-50%, -50%)",
          width:        avDiam,
          height:       avDiam,
          borderRadius: "50%",
          background:   `radial-gradient(circle at 38% 34%, ${c1}, ${c2})`,
          boxShadow:    "inset 0 -3px 8px rgba(0,0,0,0.35), inset 0 2px 6px rgba(255,255,255,0.18)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <div style={{
          position:     "absolute",
          inset:        0,
          borderRadius: "50%",
          background:   "radial-gradient(ellipse at 38% 28%, rgba(255,255,255,0.42) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />
        <span
          style={{
            color:       "rgba(255,255,255,0.94)",
            fontWeight:  900,
            fontSize:    avDiam * 0.42,
            fontFamily:  "'Inter',system-ui,sans-serif",
            letterSpacing: "-0.02em",
            lineHeight:  1,
            userSelect:  "none",
            position:    "relative",
          }}
        >
          {ini}
        </span>
      </div>

      {/* ── 2. Frame image (on top of avatar) ── */}
      {rank !== "beginner" && (
        <img
          src={FRAME_SRC[rank as FramedRank]}
          alt=""
          draggable={false}
          style={{
            position:     "absolute",
            inset:        0,
            width:        "100%",
            height:       "100%",
            objectFit:    "contain",
            zIndex:       2,
            pointerEvents: "none",
            userSelect:   "none",
          }}
        />
      )}
    </div>
  );
}
