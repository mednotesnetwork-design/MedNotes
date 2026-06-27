import React from "react";

/*
  PREMIUM FRAME — v5  (matches reference screenshot exactly)
  ═══════════════════════════════════════════════════════════
  Bead wreath : 22 green spherical beads in a full 360° ring
  Crown       : smooth rounded-tip prongs + circle caps + gems
  Flames      : teardrop gold (#1) / bronze (#3)

  ViewBox  0 0 100 125   overflow=visible for crown tips
  Avatar   cx=50 cy=70 r=24
  Ring     r=28
  Beads    r=3.4  centre-radius=28  (sit on ring outer edge)
*/

const CX = 50, CY = 70;
const AR = 24;   // avatar radius
const RR = 28;   // ring outer radius

/* ─── GREEN BEAD WREATH ──────────────────────────────────────
   22 beads in a full circle, centre-radius = RR (on ring edge).
   Each bead r=3.4 → gap ~1 unit between beads (almost touching). */
const BEAD_N = 22;
const BEAD_R = 3.4;
const BEAD_W = 28;   // bead centre radius

const BEADS = Array.from({ length: BEAD_N }, (_, i) => {
  const deg = (i / BEAD_N) * 360;
  const rad = (deg * Math.PI) / 180;
  return { x: CX + BEAD_W * Math.cos(rad), y: CY + BEAD_W * Math.sin(rad) };
});

/* ─── CROWN PRONG DEFINITIONS ────────────────────────────────
   Angular L-path silhouette + separate cap-circles at prong tips.

   Gold   5 prongs: peaks (22,5) (37,−2) (50,−13) (63,−2) (78,5)
   Silver 3 prongs: peaks (37,2) (50,−8)  (63,2)
   Bronze 3 prongs: peaks (38,7) (50,−3)  (62,7)             */

const CR_GOLD =
  "M 14,23 L 14,17 " +
  "L 16,17 L 22,5 L 28,17 " +
  "L 31,17 L 37,-2 L 43,17 " +
  "L 50,-13 " +
  "L 57,17 L 63,-2 L 69,17 " +
  "L 72,17 L 78,5 L 84,17 " +
  "L 86,17 L 86,23 Z";

const CR_SILVER =
  "M 20,23 L 20,17 " +
  "L 37,2 " +
  "L 50,-8 " +
  "L 63,2 " +
  "L 80,17 L 80,23 Z";

const CR_BRONZE =
  "M 24,23 L 24,17 " +
  "L 38,7 " +
  "L 50,-3 " +
  "L 62,7 " +
  "L 76,17 L 76,23 Z";

/* Rounded cap circles at each prong peak */
type Cap = { x: number; y: number; r: number };

const CAPS_GOLD:   Cap[] = [
  { x:22, y: 5, r:5.0 },
  { x:37, y:-2, r:5.5 },
  { x:50, y:-13, r:6.5 },
  { x:63, y:-2, r:5.5 },
  { x:78, y: 5, r:5.0 },
];
const CAPS_SILVER: Cap[] = [
  { x:37, y: 2, r:5.0 },
  { x:50, y:-8, r:6.0 },
  { x:63, y: 2, r:5.0 },
];
const CAPS_BRONZE: Cap[] = [
  { x:38, y: 7, r:4.8 },
  { x:50, y:-3, r:5.6 },
  { x:62, y: 7, r:4.8 },
];

/* ─── GEMS (sit on top of cap circles) ──────────────────────*/
type Gem = { x: number; y: number; r: number; fill: string; hi: string };

const GEMS_GOLD: Gem[] = [
  { x:22, y: 4, r:2.2, fill:"#0A2878", hi:"#6EC0FF" },  // sapphire
  { x:37, y:-3, r:2.4, fill:"#064030", hi:"#3ED898" },  // emerald
  { x:50, y:-13, r:3.2, fill:"#780C18", hi:"#FF5070" }, // ruby ★
  { x:63, y:-3, r:2.4, fill:"#064030", hi:"#3ED898" },  // emerald
  { x:78, y: 4, r:2.2, fill:"#0A2878", hi:"#6EC0FF" },  // sapphire
];
const GEMS_SILVER: Gem[] = [
  { x:37, y: 1, r:2.4, fill:"#1C304A", hi:"#ACD8FA" },
  { x:50, y:-9, r:2.8, fill:"#243050", hi:"#D4EEFF" },
  { x:63, y: 1, r:2.4, fill:"#1C304A", hi:"#ACD8FA" },
];
const GEMS_BRONZE: Gem[] = [
  { x:38, y: 6, r:2.0, fill:"#4A1600", hi:"#F0A040" },
  { x:50, y:-4, r:2.6, fill:"#4A1600", hi:"#FFD060" },
  { x:62, y: 6, r:2.0, fill:"#4A1600", hi:"#F0A040" },
];

/* ─── FLAMES ─────────────────────────────────────────────────*/
const FL_G_OL = "M 22,70 Q 3,50 16,30 Q 25,50 24,70 Z";
const FL_G_IL = "M 24,70 Q 11,56 21,42 Q 27,56 26,70 Z";
const FL_G_OR = "M 78,70 Q 97,50 84,30 Q 75,50 76,70 Z";
const FL_G_IR = "M 76,70 Q 89,56 79,42 Q 73,56 74,70 Z";
const FL_B_L  = "M 22,70 Q 5,55 17,37 Q 26,55 24,70 Z";
const FL_B_R  = "M 78,70 Q 95,55 83,37 Q 74,55 76,70 Z";

/* ─── PER-TIER CONFIG ────────────────────────────────────────*/
type GStop = [string, string];
interface TierCfg {
  crown:   string;
  crBase:  [number, number];
  caps:    Cap[];
  gems:    Gem[];
  ring:    GStop[];
  av:      GStop[];
  cr:      GStop[];
  glow:    string;
  blob:    string;
  flames:  "gold" | "bronze" | "none";
  flOuter: string;
  flInner: string;
}

const TIERS: TierCfg[] = [
  /* 0 — GOLD */
  {
    crown: CR_GOLD, crBase: [14, 72], caps: CAPS_GOLD, gems: GEMS_GOLD,
    ring: [
      ["0%","#3A1E00"],["12%","#8A5000"],["28%","#C89C1C"],
      ["44%","#FFE050"],["50%","#FFFACC"],["56%","#F4C212"],
      ["72%","#C89C1C"],["88%","#8A5000"],["100%","#3A1E00"],
    ],
    av:  [["0%","hsl(130 60% 34%)"],["100%","hsl(130 60% 14%)"]],
    cr:  [
      ["0%","#7A4800"],["25%","#E8C830"],["50%","#FFFACC"],
      ["75%","#D0A010"],["100%","#7A4800"],
    ],
    glow: "drop-shadow(0 0 20px rgba(255,204,0,0.95)) drop-shadow(0 0 48px rgba(255,120,0,0.52)) drop-shadow(0 12px 28px rgba(0,0,0,0.32))",
    blob: "rgba(255,172,0,0.30)", flames: "gold",
    flOuter: "#FF5200", flInner: "#FFEE00",
  },
  /* 1 — SILVER */
  {
    crown: CR_SILVER, crBase: [20, 60], caps: CAPS_SILVER, gems: GEMS_SILVER,
    ring: [
      ["0%","#101820"],["12%","#384E5C"],["28%","#72909E"],
      ["44%","#C0D6E4"],["50%","#EEF8FF"],["56%","#80A0AE"],
      ["72%","#B4D0E2"],["88%","#384E5C"],["100%","#101820"],
    ],
    av:  [["0%","hsl(130 52% 32%)"],["100%","hsl(130 52% 14%)"]],
    cr:  [
      ["0%","#2A4050"],["25%","#B0D0E4"],["50%","#EEF8FF"],
      ["75%","#78A0B0"],["100%","#2A4050"],
    ],
    glow: "drop-shadow(0 0 16px rgba(132,176,220,0.90)) drop-shadow(0 0 38px rgba(80,134,188,0.52)) drop-shadow(0 12px 28px rgba(0,0,0,0.22))",
    blob: "rgba(136,180,224,0.26)", flames: "none",
    flOuter: "", flInner: "",
  },
  /* 2 — BRONZE */
  {
    crown: CR_BRONZE, crBase: [24, 52], caps: CAPS_BRONZE, gems: GEMS_BRONZE,
    ring: [
      ["0%","#180800"],["12%","#582400"],["28%","#944E10"],
      ["44%","#C87A2E"],["50%","#F2B068"],["56%","#B07018"],
      ["72%","#CC8820"],["88%","#582400"],["100%","#180800"],
    ],
    av:  [["0%","hsl(130 50% 32%)"],["100%","hsl(130 50% 13%)"]],
    cr:  [
      ["0%","#582400"],["25%","#CC8028"],["50%","#F0AE66"],
      ["75%","#944E10"],["100%","#582400"],
    ],
    glow: "drop-shadow(0 0 16px rgba(196,116,28,0.90)) drop-shadow(0 0 38px rgba(152,74,8,0.52)) drop-shadow(0 12px 28px rgba(0,0,0,0.28))",
    blob: "rgba(196,104,20,0.26)", flames: "bronze",
    flOuter: "#E03000", flInner: "#FF9E14",
  },
];

/* ─── COMPONENT ──────────────────────────────────────────────*/
export function PremiumFrame({
  name,
  pos,
  size = 100,
}: {
  name:  string;
  pos:   0 | 1 | 2;
  size?: number;
}) {
  const t  = TIERS[pos];
  const id = `pf${pos}`;
  const ini = (name ?? "?").charAt(0).toUpperCase();
  const w  = size;
  const h  = Math.round(size * 1.25);

  const stops = (ss: GStop[]) =>
    ss.map(([off, col], i) => <stop key={i} offset={off} stopColor={col} />);

  return (
    <div style={{ width: w, height: h, flexShrink: 0, position: "relative" }}>
      <svg
        viewBox="0 0 100 125"
        width={w}
        height={h}
        overflow="visible"
        style={{ display: "block", filter: t.glow }}
        aria-hidden="true"
      >
        <defs>
          {/* Metallic ring */}
          <linearGradient id={`${id}rg`} x1="14%" y1="0%" x2="86%" y2="100%">
            {stops(t.ring)}
          </linearGradient>
          {/* Avatar green fill */}
          <radialGradient id={`${id}av`} cx="38%" cy="34%" r="68%">
            {stops(t.av)}
          </radialGradient>
          {/* Avatar gloss */}
          <radialGradient id={`${id}gl`} cx="32%" cy="28%" r="52%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.54)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
          </radialGradient>
          {/* Avatar depth shadow */}
          <radialGradient id={`${id}ds`} cx="50%" cy="92%" r="52%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0.48)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.00)" />
          </radialGradient>
          {/* Green bead gradient — 3D sphere effect */}
          <radialGradient id={`${id}bd`} cx="34%" cy="28%" r="68%">
            <stop offset="0%"   stopColor="#B0F040" />
            <stop offset="40%"  stopColor="#3AA000" />
            <stop offset="100%" stopColor="#0E4600" />
          </radialGradient>
          {/* Crown gradient */}
          <linearGradient id={`${id}cr`} x1="50%" y1="0%" x2="50%" y2="100%">
            {stops(t.cr)}
          </linearGradient>
          {/* Flames */}
          {t.flames !== "none" && (
            <>
              <radialGradient id={`${id}fl`} cx="50%" cy="92%" r="60%">
                <stop offset="0%"   stopColor={t.flOuter} stopOpacity="0.96" />
                <stop offset="55%"  stopColor={t.flOuter} stopOpacity="0.46" />
                <stop offset="100%" stopColor={t.flOuter} stopOpacity="0.00" />
              </radialGradient>
              <radialGradient id={`${id}fl2`} cx="50%" cy="92%" r="60%">
                <stop offset="0%"   stopColor={t.flInner} stopOpacity="0.88" />
                <stop offset="100%" stopColor={t.flInner} stopOpacity="0.00" />
              </radialGradient>
            </>
          )}
        </defs>

        {/* ━━ AMBIENT GLOW ━━ */}
        <circle cx={CX} cy={CY} r={56} fill={t.blob} opacity="0.50" />

        {/* ━━ FLAMES (behind ring) ━━ */}
        {t.flames !== "none" && (
          <g>
            {t.flames === "gold" ? (
              <>
                <path d={FL_G_OL} fill={`url(#${id}fl)`} />
                <path d={FL_G_OR} fill={`url(#${id}fl)`} />
                <path d={FL_G_IL} fill={`url(#${id}fl2)`} />
                <path d={FL_G_IR} fill={`url(#${id}fl2)`} />
              </>
            ) : (
              <>
                <path d={FL_B_L} fill={`url(#${id}fl)`} />
                <path d={FL_B_R} fill={`url(#${id}fl)`} />
              </>
            )}
          </g>
        )}

        {/* ━━ RING SHADOW ━━ */}
        <circle cx={CX} cy={CY + 4} r={RR + 2.5} fill="rgba(0,0,0,0.32)" />

        {/* ━━ METALLIC RING ━━ */}
        <circle cx={CX} cy={CY} r={RR} fill={`url(#${id}rg)`} />

        {/* ━━ AVATAR FACE ━━ */}
        <circle cx={CX} cy={CY} r={AR} fill={`url(#${id}av)`} />
        <circle cx={CX} cy={CY} r={AR} fill={`url(#${id}gl)`} />
        <circle cx={CX} cy={CY} r={AR} fill={`url(#${id}ds)`} />

        {/* ━━ BEVEL EDGES ━━ */}
        <circle cx={CX} cy={CY} r={RR} fill="none"
          stroke="rgba(255,255,255,0.32)" strokeWidth="1.2" />
        <circle cx={CX} cy={CY} r={AR} fill="none"
          stroke="rgba(255,255,255,0.20)" strokeWidth="0.8" />

        {/* ━━ GREEN BEAD WREATH ━━ */}
        {BEADS.map((b, i) => (
          <g key={i}>
            {/* bead soft shadow */}
            <circle cx={b.x + 0.4} cy={b.y + 0.7} r={BEAD_R + 0.7} fill="rgba(0,0,0,0.28)" />
            {/* bead body */}
            <circle cx={b.x} cy={b.y} r={BEAD_R} fill={`url(#${id}bd)`} />
            {/* specular highlight (small bright dot) */}
            <circle
              cx={b.x - BEAD_R * 0.32} cy={b.y - BEAD_R * 0.38}
              r={BEAD_R * 0.30} fill="rgba(255,255,255,0.70)"
            />
          </g>
        ))}

        {/* ━━ AVATAR INITIAL ━━ */}
        <text x={CX} y={CY + 2}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={AR * 0.94} fontWeight="900"
          fill="rgba(255,255,255,0.96)"
          fontFamily="'Inter',system-ui,sans-serif"
          letterSpacing="-0.02em"
        >{ini}</text>

        {/* ━━ CROWN SHADOW ━━ */}
        <path d={t.crown} fill="rgba(0,0,0,0.36)" transform="translate(0.8,1.8)" />
        {t.caps.map((c, i) => (
          <circle key={`cs${i}`}
            cx={c.x + 0.8} cy={c.y + 1.8} r={c.r}
            fill="rgba(0,0,0,0.36)" />
        ))}

        {/* ━━ CROWN BODY ━━ */}
        <path d={t.crown} fill={`url(#${id}cr)`} />

        {/* ━━ CROWN CAP CIRCLES (round off each prong tip) ━━ */}
        {t.caps.map((c, i) => (
          <circle key={`cc${i}`} cx={c.x} cy={c.y} r={c.r}
            fill={`url(#${id}cr)`}
            stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
        ))}

        {/* Crown highlight stroke */}
        <path d={t.crown} fill="none"
          stroke="rgba(255,255,255,0.28)" strokeWidth="0.8" strokeLinejoin="round" />

        {/* ━━ CROWN BASE BAND ━━ */}
        <rect x={t.crBase[0]} y={21}   width={t.crBase[1]} height={4.5} rx={2.2}
          fill={`url(#${id}rg)`} />
        <rect x={t.crBase[0]} y={21}   width={t.crBase[1]} height={1.5} rx={0.8}
          fill="rgba(255,255,255,0.42)" />
        <rect x={t.crBase[0]} y={24.6} width={t.crBase[1]} height={0.9} rx={0.5}
          fill="rgba(0,0,0,0.28)" />

        {/* ━━ GEMS ━━ */}
        {t.gems.map((g, i) => (
          <g key={i}>
            <circle cx={g.x} cy={g.y + 0.7} r={g.r * 1.18} fill="rgba(0,0,0,0.36)" />
            <circle cx={g.x} cy={g.y}        r={g.r}         fill={g.fill} />
            <ellipse cx={g.x}              cy={g.y - g.r * 0.20}
              rx={g.r * 0.68} ry={g.r * 0.46} fill={g.hi} opacity={0.94} />
            <circle  cx={g.x - g.r * 0.32} cy={g.y - g.r * 0.50}
              r={g.r * 0.22} fill="white" opacity={0.78} />
          </g>
        ))}
      </svg>
    </div>
  );
}
