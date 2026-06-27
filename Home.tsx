import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Trophy, TrendingUp, BarChart2, Search, Download, Heart,
  Bookmark, Star,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  useListUniversities,
  useListModules,
  useGetTopNotes,
  useGetLeaderboard,
  useGetTrendingNotes,
} from "@workspace/api-client-react";
import { TITLE_META, getBestTitle, getProgressionProgress } from "@/lib/gamification";
import { TitleBadge } from "@/components/LevelAvatar";
import type { LeaderboardEntry } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";

import { NoteCard }      from "@/components/NoteCard";
import { LeftSidebar }   from "@/components/LeftSidebar";
import { AppLogo }       from "@/components/AppLogo";
import { RankFrame }     from "@/components/RankFrame";
import type { ProgressionRankKey } from "@/lib/gamification";

// ── Content-type pills ───────────────────────────────────────
const TYPE_PILLS = [
  {
    key: "all",
    label: "الكل",
    activeBg: "linear-gradient(135deg,hsl(130 42% 50%),hsl(130 35% 40%))",
    activeColor: "white",
    activeShadow: "0 3px 12px rgba(78,138,89,0.30)",
    passiveBg: "rgba(134,201,141,0.14)",
    passiveColor: "hsl(130 38% 36%)",
    passiveBorder: "rgba(134,201,141,0.30)",
  },
  {
    key: "summaries",
    label: "ملخصات",
    activeBg: "linear-gradient(135deg,hsl(130 42% 50%),hsl(130 35% 40%))",
    activeColor: "white",
    activeShadow: "0 3px 12px rgba(78,138,89,0.30)",
    passiveBg: "rgba(134,201,141,0.14)",
    passiveColor: "hsl(130 38% 36%)",
    passiveBorder: "rgba(134,201,141,0.30)",
  },
  {
    key: "transcriptions",
    label: "تفريغات",
    activeBg: "linear-gradient(135deg,hsl(338 58% 62%),hsl(338 52% 52%))",
    activeColor: "white",
    activeShadow: "0 3px 12px rgba(220,96,136,0.28)",
    passiveBg: "rgba(248,160,196,0.16)",
    passiveColor: "hsl(338 50% 42%)",
    passiveBorder: "rgba(248,160,196,0.32)",
  },
  {
    key: "explanations",
    label: "شروحات",
    activeBg: "linear-gradient(135deg,hsl(25 80% 58%),hsl(25 72% 48%))",
    activeColor: "white",
    activeShadow: "0 3px 12px rgba(234,140,60,0.28)",
    passiveBg: "rgba(253,186,116,0.18)",
    passiveColor: "hsl(25 68% 38%)",
    passiveBorder: "rgba(253,186,116,0.34)",
  },
  {
    key: "questions",
    label: "أسئلة",
    activeBg: "linear-gradient(135deg,hsl(262 52% 62%),hsl(262 46% 52%))",
    activeColor: "white",
    activeShadow: "0 3px 12px rgba(124,58,237,0.22)",
    passiveBg: "rgba(196,181,253,0.20)",
    passiveColor: "hsl(262 44% 42%)",
    passiveBorder: "rgba(196,181,253,0.38)",
  },
];

const YEARS = ["١", "٢", "٣", "٤", "٥", "٦"];

// ── Author avatar gradients ───────────────────────────────────
const AUTHOR_GRADS = [
  "linear-gradient(135deg,#86C98D,#4A9A55)",
  "linear-gradient(135deg,#F9B8CC,#DC6088)",
  "linear-gradient(135deg,#93C5FD,#3B82F6)",
  "linear-gradient(135deg,#FCD34D,#F59E0B)",
  "linear-gradient(135deg,#A5F3C4,#10B981)",
  "linear-gradient(135deg,#C4B5FD,#7C3AED)",
];

// ── Popular categories ────────────────────────────────────────
const CATEGORIES = [
  { label: "القلب",    color: "bg-red-100/80    text-red-700"     },
  { label: "التشريح",  color: "bg-violet-100/80 text-violet-700"  },
  { label: "الكيمياء", color: "bg-amber-100/80  text-amber-700"   },
  { label: "الأمراض",  color: "bg-blue-100/80   text-blue-700"    },
  { label: "الأدوية",  color: "bg-emerald-100/80 text-emerald-700"},
  { label: "الجراحة",  color: "bg-pink-100/80   text-pink-700"    },
  { label: "الأطفال",  color: "bg-cyan-100/80   text-cyan-700"    },
  { label: "النساء",   color: "bg-rose-100/80   text-rose-700"    },
  { label: "الأعصاب",  color: "bg-indigo-100/80 text-indigo-700"  },
  { label: "المجتمع",  color: "bg-teal-100/80   text-teal-700"    },
];

// ── Honor Board constants ─────────────────────────────────────
const HIGH_RANKS = new Set(["gold", "diamond", "elite"]);

/** Premium metallic podium config — realistic multi-stop ring gradients */
const PODIUM_META = [
  /* ── #1 Polished Gold Crown ── */
  {
    ringBg:     "linear-gradient(145deg,#4A2C00 0%,#9A6200 10%,#D4A017 20%,#FFE168 32%,#FFF8B8 38%,#F5C518 46%,#D4900A 56%,#FFD44C 66%,#C89000 76%,#9A6200 86%,#4A2C00 100%)",
    avatarBg:   "linear-gradient(145deg,#C18900,#F5C842,#D4A017,#FFE168)",
    glowLayers: "0 0 0 1.5px rgba(255,210,0,0.40),0 0 18px rgba(255,180,0,0.52),0 0 38px rgba(240,150,0,0.26),0 8px 28px rgba(0,0,0,0.24)",
    haloColor:  "rgba(255,195,0,0.28)",
    cardBg:     "linear-gradient(135deg,rgba(255,248,200,0.60) 0%,rgba(255,235,140,0.28) 100%)",
    cardBorder: "rgba(240,195,20,0.32)",
    barBg:      "linear-gradient(90deg,#C4900A,#FFD700,#F5C518)",
    barGlow:    "0 0 8px rgba(255,195,0,0.55),0 0 18px rgba(255,160,0,0.28)",
    icon:       "👑",
    rankLabel:  "#1",
    iconGlow:   "drop-shadow(0 0 7px rgba(255,205,0,0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.28))",
    breathe:    "mdn-gold-breathe",
    particleColor: "rgba(255,215,0,0.72)",
    textColor:  "#7A4E00",
    labelColor: "#fff",
    pad:        4,
  },
  /* ── #2 Polished Silver Crystal ── */
  {
    ringBg:     "linear-gradient(145deg,#2A3840 0%,#607080 12%,#98B0C4 22%,#D4E6F4 34%,#EEF6FC 40%,#9ABCCE 50%,#506070 60%,#A8C0CC 70%,#D0E2EC 80%,#607080 90%,#2A3840 100%)",
    avatarBg:   "linear-gradient(145deg,#506878,#A8C4D6,#6888A0,#C4D8E8)",
    glowLayers: "0 0 0 1.5px rgba(170,205,230,0.38),0 0 14px rgba(140,160,180,0.48),0 0 28px rgba(90,130,170,0.20),0 6px 22px rgba(0,0,0,0.18)",
    haloColor:  "rgba(140,165,185,0.22)",
    cardBg:     "linear-gradient(135deg,rgba(220,238,252,0.52) 0%,rgba(195,215,232,0.24) 100%)",
    cardBorder: "rgba(140,165,185,0.28)",
    barBg:      "linear-gradient(90deg,#607080,#A8C0D4,#9AB6C8)",
    barGlow:    "0 0 6px rgba(140,165,185,0.50),0 0 14px rgba(90,130,165,0.24)",
    icon:       "✦",
    rankLabel:  "#2",
    iconGlow:   "drop-shadow(0 0 5px rgba(160,205,235,0.72)) drop-shadow(0 1px 3px rgba(0,0,0,0.22))",
    breathe:    "mdn-silver-breathe",
    particleColor: "rgba(175,210,235,0.65)",
    textColor:  "#344858",
    labelColor: "#fff",
    pad:        3.5,
  },
  /* ── #3 Polished Bronze Flame ── */
  {
    ringBg:     "linear-gradient(145deg,#341500 0%,#804800 12%,#BC7228 22%,#E8964A 34%,#F5BA78 40%,#D28832 50%,#905200 60%,#CA8438 70%,#E8A448 80%,#825000 90%,#341500 100%)",
    avatarBg:   "linear-gradient(145deg,#824E00,#D0882C,#9C5E1A,#E4A044)",
    glowLayers: "0 0 0 1.5px rgba(195,118,38,0.38),0 0 14px rgba(188,108,36,0.46),0 0 28px rgba(155,78,18,0.20),0 6px 22px rgba(0,0,0,0.22)",
    haloColor:  "rgba(195,108,28,0.20)",
    cardBg:     "linear-gradient(135deg,rgba(244,210,160,0.44) 0%,rgba(228,178,118,0.22) 100%)",
    cardBorder: "rgba(196,128,48,0.26)",
    barBg:      "linear-gradient(90deg,#905200,#CD7F32,#D08830)",
    barGlow:    "0 0 6px rgba(196,118,40,0.50),0 0 14px rgba(155,78,20,0.24)",
    icon:       "🔥",
    rankLabel:  "#3",
    iconGlow:   "drop-shadow(0 0 5px rgba(228,138,38,0.70)) drop-shadow(0 1px 3px rgba(0,0,0,0.26))",
    breathe:    "mdn-bronze-breathe",
    particleColor: "rgba(220,140,38,0.65)",
    textColor:  "#563000",
    labelColor: "#fff",
    pad:        3.5,
  },
] as const;

// ── Glassmorphism panel wrapper ───────────────────────────────
function RightPanel({
  gradient, icon, title, children,
}: {
  gradient: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background:           "rgba(255,255,255,0.65)",
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border:               "1px solid rgba(255,255,255,0.82)",
        boxShadow:            "0 6px 28px rgba(0,0,0,0.07)",
        borderRadius:         "1.25rem",
        overflow:             "hidden",
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: gradient }}>
        {icon}
        <h3 className="font-bold text-sm" dir="rtl" style={{ color: "rgba(0,0,0,0.68)" }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ── Honor Board panel content ──────────────────────────────────


function HonorBoardContent({
  lbLoading, leaderboard,
}: {
  lbLoading: boolean;
  leaderboard?: LeaderboardEntry[];
}) {
  const honorees = (leaderboard ?? [])
    .filter((e) => HIGH_RANKS.has(e.progressionRank))
    .slice(0, 3);

  const [first, second, third] = honorees;

  /* ── Floating light particle ── */
  const Dot = ({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) => (
    <span
      className="mdn-honor-particle"
      style={{
        position: "absolute", left: `${x}%`, top: `${y}%`,
        width: 3, height: 3, borderRadius: "50%",
        background: color,
        boxShadow: `0 0 5px ${color}`,
        animationDelay: `${delay}s`,
        pointerEvents: "none", zIndex: 8,
      }}
    />
  );

  /* ── Featured #1 card ── */
  const FeaturedCard = ({ entry }: { entry: LeaderboardEntry }) => {
    const m   = PODIUM_META[0];
    const pct = getProgressionProgress(entry.points);
    const bestTitle = getBestTitle(entry.titles);
    return (
      <div
        className="mdn-honor-card"
        style={{
          position: "relative",
          background: m.cardBg,
          border: `1px solid ${m.cardBorder}`,
          borderRadius: 18,
          padding: "18px 14px 13px",
          overflow: "hidden",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        {/* Decorative ambient blobs */}
        <div style={{
          position: "absolute", top: -32, right: -24, width: 110, height: 110,
          background: `radial-gradient(circle,rgba(255,200,0,0.18),transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -18, left: -14, width: 80, height: 80,
          background: `radial-gradient(circle,rgba(255,185,0,0.14),transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />

        {/* Rank badge */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          background: m.barBg,
          borderRadius: "12px 0 10px 0",
          padding: "3px 10px",
          fontSize: 9, fontWeight: 900, color: m.labelColor,
          letterSpacing: "0.06em",
          boxShadow: m.barGlow,
        }}>
          {m.rankLabel}
        </div>

        {/* Center layout */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" }}>
          {/* Avatar with particles */}
          <div style={{ position: "relative", marginTop: 12 }}>
            <Dot x={8}  y={30} delay={0}    color={m.particleColor} />
            <Dot x={88} y={24} delay={0.65} color={m.particleColor} />
            <Dot x={12} y={78} delay={1.3}  color={m.particleColor} />
            <Dot x={82} y={74} delay={1.9}  color={m.particleColor} />
            <Dot x={50} y={8}  delay={0.95} color={m.particleColor} />
            <RankFrame
              name={entry.authorName ?? "?"}
              rank={entry.progressionRank as ProgressionRankKey}
              size={100}
            />
          </div>

          {/* Name */}
          <p style={{
            fontSize: 13, fontWeight: 800,
            color: "hsl(130 44% 15%)", textAlign: "center", lineHeight: 1.2,
            marginTop: 2,
          }} dir="rtl">{entry.authorName}</p>

          {/* Title */}
          {bestTitle && (
            <div style={{ transform: "scale(0.88)", marginTop: -4 }}>
              <TitleBadge titleKey={bestTitle} />
            </div>
          )}

          {/* Points */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }} dir="rtl">
            <span style={{
              fontSize: 20, fontWeight: 900,
              color: m.textColor, letterSpacing: "-0.04em",
            }}>{entry.points.toLocaleString()}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: m.textColor, opacity: 0.65 }}>نقطة</span>
          </div>

          {/* Progress bar */}
          <div style={{
            width: "100%", height: 3,
            background: "rgba(0,0,0,0.07)", borderRadius: 99,
          }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 99,
              background: m.barBg,
              boxShadow: m.barGlow,
              transition: "width 0.9s ease",
            }} />
          </div>
        </div>
      </div>
    );
  };

  /* ── Side card (#2 and #3) ── */
  const SideCard = ({ entry, pos }: { entry: LeaderboardEntry; pos: 1|2 }) => {
    const m   = PODIUM_META[pos];
    const pct = getProgressionProgress(entry.points);
    return (
      <div
        className="mdn-honor-card"
        style={{
          position: "relative",
          background: m.cardBg,
          border: `1px solid ${m.cardBorder}`,
          borderRadius: 15,
          padding: "13px 10px 10px",
          overflow: "hidden",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Ambient blob */}
        <div style={{
          position: "absolute", top: -20, right: -12, width: 64, height: 64,
          background: `radial-gradient(circle,${m.haloColor},transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />

        {/* Rank badge */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          background: m.barBg,
          borderRadius: "10px 0 8px 0",
          padding: "2px 8px",
          fontSize: 8, fontWeight: 900, color: m.labelColor,
          letterSpacing: "0.06em",
          boxShadow: m.barGlow,
        }}>
          {m.rankLabel}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
          <div style={{ marginTop: 10 }}>
            <RankFrame
              name={entry.authorName ?? "?"}
              rank={entry.progressionRank as ProgressionRankKey}
              size={70}
            />
          </div>

          <p style={{
            fontSize: 11, fontWeight: 800,
            color: "hsl(130 44% 15%)", textAlign: "center",
            lineHeight: 1.2, width: "100%",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }} dir="rtl">{entry.authorName}</p>

          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }} dir="rtl">
            <span style={{
              fontSize: 15, fontWeight: 900,
              color: m.textColor, letterSpacing: "-0.03em",
            }}>{entry.points.toLocaleString()}</span>
            <span style={{ fontSize: 8, color: m.textColor, opacity: 0.60 }}>نقطة</span>
          </div>

          {/* Progress bar */}
          <div style={{
            width: "100%", height: 2.5,
            background: "rgba(0,0,0,0.07)", borderRadius: 99,
          }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 99,
              background: m.barBg,
              boxShadow: m.barGlow,
              transition: "width 0.9s ease",
            }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "10px 10px 10px" }}>
      {lbLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton className="h-52 rounded-2xl" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        </div>
      ) : honorees.length === 0 ? (
        <p style={{ textAlign: "center", fontSize: 11, padding: "20px 0", color: "hsl(130 14% 58%)" }} dir="rtl">
          لا يوجد مساهمون بمرتبة عالية بعد
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {first  && <FeaturedCard entry={first} />}
          {(second || third) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {second && <SideCard entry={second} pos={1} />}
              {third  && <SideCard entry={third}  pos={2} />}
            </div>
          )}
        </div>
      )}

      <Link href="/contributors">
        <button
          style={{
            width: "100%", marginTop: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px 0",
            borderRadius: 99,
            background: "linear-gradient(135deg,rgba(78,138,89,0.11),rgba(58,108,68,0.07))",
            border: "1px solid rgba(78,138,89,0.16)",
            color: "hsl(130 38% 34%)",
            fontSize: 11, fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 0.18s ease",
          }}
          dir="rtl"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span>عرض جميع المساهمين</span>
          <span style={{ fontSize: 13, marginRight: 2 }}>←</span>
        </button>
      </Link>
    </div>
  );
}

// ── Trending panel content ─────────────────────────────────────
type TrendNote = { id: number; title: string; upvotes: number; downloads: number; saves: number };
function TrendingPanelContent({
  trendingLoading, trendingNotes, topNotes,
}: {
  trendingLoading: boolean;
  trendingNotes?: TrendNote[];
  topNotes?: TrendNote[];
}) {
  const notes = (trendingNotes ?? topNotes)?.slice(0, 4);
  const bgClasses = ["bg-card-peach", "bg-card-sage", "bg-card-rose", "bg-card-yellow"];
  return (
    <div className="px-3 py-3 flex flex-col gap-1.5">
      {trendingLoading
        ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-9 rounded-xl" />)
        : notes?.map((note, i) => (
            <Link key={note.id} href={`/notes/${note.id}`}>
              <div
                className={`${bgClasses[i % bgClasses.length]} px-3 py-2.5 rounded-xl cursor-pointer hover:scale-[1.02] transition-transform`}
                style={{ border: "1px solid rgba(255,255,255,0.65)" }}
              >
                <p className="text-xs font-semibold line-clamp-1 mb-1" style={{ color: "hsl(130 42% 18%)" }}>
                  {note.title}
                </p>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: "hsl(130 14% 48%)" }}>
                  <span className="flex items-center gap-0.5 text-rose-500 font-semibold">
                    <Heart size={10} fill="currentColor" /> {note.upvotes}
                  </span>
                  <span className="flex items-center gap-0.5 text-primary font-semibold">
                    <Download size={10} /> {note.downloads}
                  </span>
                  <span className="flex items-center gap-0.5 font-semibold" style={{ color: "hsl(220 70% 52%)" }}>
                    <Bookmark size={10} /> {note.saves}
                  </span>
                </div>
              </div>
            </Link>
          ))}
    </div>
  );
}

// ── Horizontal pill-shaped filter dropdown ────────────────────
function FilterPill({
  label, icon, value, onChange, children, accentColor,
}: {
  label: string;
  icon: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  accentColor: string;
}) {
  const active = Boolean(value);
  return (
    <div
      className="relative flex-1 flex items-center gap-1.5 px-3 transition-all"
      style={{
        height:               "48px",
        minWidth:             "72px",
        background:           active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.65)",
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border:               active
          ? `1.5px solid ${accentColor}50`
          : "1px solid rgba(255,255,255,0.82)",
        borderRadius:         "9999px",
        boxShadow:            active
          ? `0 4px 18px ${accentColor}22, inset 0 1px 0 rgba(255,255,255,1)`
          : "0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.88)",
        cursor:               "pointer",
        overflow:             "hidden",
      }}
    >
      <span className="text-sm leading-none shrink-0">{icon}</span>
      <span
        className="text-[11px] font-bold whitespace-nowrap leading-tight"
        dir="rtl"
        style={{ color: active ? "hsl(130 42% 18%)" : "hsl(130 14% 48%)" }}
      >
        {label}
      </span>
      {active && (
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto"
          style={{ background: accentColor }}
        />
      )}
      {/* Invisible native select covers entire pill */}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        dir="rtl"
        style={{
          position:         "absolute",
          inset:            0,
          opacity:          0,
          width:            "100%",
          height:           "100%",
          cursor:           "pointer",
          WebkitAppearance: "none",
          appearance:       "none",
        }}
      >
        <option value="">الكل</option>
        {children}
      </select>
    </div>
  );
}

export function Home() {
  const [, setLocation] = useLocation();
  const { t }    = useTranslation();
  const { isRTL } = useLanguage();

  // Content-type pills
  const [activeType, setActiveType] = useState("all");

  // Filter dropdowns
  const [filterUni,    setFilterUni]    = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterYear,   setFilterYear]   = useState("");

  // Search
  const [query, setQuery] = useState("");

  const { data: universities,  isLoading: unisLoading      } = useListUniversities();
  const { data: modules,       isLoading: modulesLoading   } = useListModules();
  const { data: topNotes,      isLoading: notesLoading     } = useGetTopNotes();
  const { data: leaderboard,   isLoading: lbLoading        } = useGetLeaderboard({ category: "points", period: "all" });
  const { data: trendingNotes, isLoading: trendingLoading  } = useGetTrendingNotes();

  // ── Client-side filter logic ──────────────────────────────
  const getTags = (note: { tags?: unknown }): string[] => {
    if (Array.isArray(note.tags)) return note.tags as string[];
    if (typeof note.tags === "string")
      return (note.tags as string).split(",").map((t: string) => t.trim());
    return [];
  };

  const filtered = topNotes?.filter(note => {
    const tags = getTags(note);

    // Content-type pill filter
    if (activeType !== "all") {
      const typeMap: Record<string, string[]> = {
        summaries:      ["summary", "ملخص"],
        transcriptions: ["transcription", "تفريغ"],
        explanations:   ["explanation", "شرح"],
        questions:      ["question", "سؤال", "أسئلة"],
      };
      const keywords = typeMap[activeType] ?? [];
      const matchType = keywords.some(kw =>
        tags.some(tg => tg.toLowerCase().includes(kw.toLowerCase()))
      );
      if (!matchType) return false;
    }

    // Dropdown filters
    if (filterUni    && String(note.universityId) !== filterUni)   return false;
    if (filterModule && String(note.moduleId)     !== filterModule) return false;
    if (filterYear   && note.year !== undefined && String(note.year) !== filterYear) return false;

    // Search
    if (query && !note.title.toLowerCase().includes(query.toLowerCase())) return false;

    return true;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setLocation(`/notes?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl">

      {/* ══════════════════════════════════════════════════════
          THREE-COLUMN LAYOUT (hero lives inside center column)
      ══════════════════════════════════════════════════════ */}
      <div className="flex gap-4 items-start pb-10">

        {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
        <LeftSidebar />

        {/* ── CENTER CONTENT ───────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col gap-3">

          {/* ── Hero — compact centered brand block ── */}
          <div className="flex flex-col items-center pt-5 pb-3 gap-1.5">
            <div className="flex items-center gap-2.5">
              <AppLogo size={40} />
              <h1
                className="font-serif font-extrabold text-3xl leading-none"
                style={{ color: "hsl(130 45% 16%)" }}
              >
                MedNotes
              </h1>
            </div>
            <p
              className="text-sm font-semibold"
              style={{ color: "hsl(130 33% 42%)" }}
              dir="rtl"
            >
              تعلّم، شارك، واترك أثرًا 🌿
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch}>
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{
                background:           "rgba(255,255,255,0.72)",
                backdropFilter:       "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border:               "1px solid rgba(255,255,255,0.88)",
                boxShadow:            "0 6px 28px rgba(0,0,0,0.06)",
                borderRadius:         "9999px",
              }}
            >
              <Search size={16} style={{ color: "hsl(130 18% 58%)" }} className="shrink-0" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ابحث عن مادة، عنوان، طالب، أو نوع محتوى..."
                dir="rtl"
                className="flex-1 h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground/55"
              />
              <button
                type="submit"
                className="h-8 px-5 rounded-full text-sm font-semibold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(130 42% 50%), hsl(130 35% 40%))" }}
              >
                {t("home.hero.searchBtn")}
              </button>
            </div>
          </form>

          {/* ── Four filter pills — single horizontal row ──────── */}
          <div className="flex gap-2" dir="rtl">

            <FilterPill
              label="الجامعة"
              icon="🏛️"
              value={filterUni}
              onChange={setFilterUni}
              accentColor="hsl(130,48%,52%)"
            >
              {universities?.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {isRTL && u.nameAr ? u.nameAr : u.name}
                </option>
              ))}
            </FilterPill>

            <FilterPill
              label="المادة"
              icon="📚"
              value={filterModule}
              onChange={setFilterModule}
              accentColor="hsl(25,78%,54%)"
            >
              {modules?.map(m => (
                <option key={m.id} value={String(m.id)}>
                  {isRTL && m.nameAr ? m.nameAr : m.name}
                </option>
              ))}
            </FilterPill>

            <FilterPill
              label="الموديول"
              icon="🔬"
              value={filterModule}
              onChange={setFilterModule}
              accentColor="hsl(200,60%,52%)"
            >
              {modules?.map(m => (
                <option key={m.id} value={String(m.id)}>
                  {isRTL && m.nameAr ? m.nameAr : m.name}
                </option>
              ))}
            </FilterPill>

            <FilterPill
              label="السنة"
              icon="📅"
              value={filterYear}
              onChange={setFilterYear}
              accentColor="hsl(280,48%,58%)"
            >
              {YEARS.map((yr, i) => (
                <option key={yr} value={String(i + 1)}>السنة {yr}</option>
              ))}
            </FilterPill>
          </div>

          {/* Clear filters link */}
          {(filterUni || filterModule || filterYear) && (
            <div className="flex justify-end">
              <button
                onClick={() => { setFilterUni(""); setFilterModule(""); setFilterYear(""); }}
                className="text-[11px] font-bold px-3 py-1 rounded-full transition-all hover:opacity-80"
                style={{ background: "rgba(220,96,136,0.10)", color: "hsl(338 52% 52%)" }}
                dir="rtl"
              >
                مسح الفلاتر ✕
              </button>
            </div>
          )}

          {/* Content-type pills — horizontal scroll, individual pastel colors */}
          <div
            className="flex gap-2 overflow-x-auto pb-0.5"
            dir="rtl"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {TYPE_PILLS.map(pill => {
              const isActive = activeType === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => setActiveType(pill.key)}
                  className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap shrink-0 transition-all"
                  style={isActive ? {
                    background: pill.activeBg,
                    color:      pill.activeColor,
                    boxShadow:  pill.activeShadow,
                    border:     "1.5px solid transparent",
                  } : {
                    background: pill.passiveBg,
                    color:      pill.passiveColor,
                    border:     `1.5px solid ${pill.passiveBorder}`,
                    boxShadow:  "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Result count */}
          <p
            className="text-xs font-semibold px-1"
            style={{ color: "hsl(130 14% 54%)" }}
            dir="rtl"
          >
            {notesLoading ? "…" : `${filtered?.length ?? 0} ملاحظة`}
          </p>

          {/* Pinterest masonry feed */}
          {notesLoading ? (
            <div className="columns-2 lg:columns-3" style={{ columnGap: 12 }}>
              {[158,202,220,178,248,193].map((h, i) => (
                <div key={i} className="break-inside-avoid mb-3">
                  <Skeleton className="rounded-[1.1rem]" style={{ height: h + 80 }} />
                </div>
              ))}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="columns-2 lg:columns-3" style={{ columnGap: 12 }}>
              {[...filtered]
                .sort((a, b) => (b.upvotes + b.downloads) - (a.upvotes + a.downloads))
                .map((note, i) => (
                  <div key={note.id} className="break-inside-avoid mb-3">
                    <NoteCard
                      id={note.id}
                      title={note.title}
                      universityName={note.universityName}
                      moduleName={note.moduleName}
                      authorName={note.authorName}
                      fileType={note.fileType}
                      fileUrl={note.fileUrl}
                      fileName={note.fileName}
                      upvotes={note.upvotes}
                      downloads={note.downloads}
                      saves={note.saves}
                      tags={note.tags}
                      colorIndex={i}
                    />
                  </div>
                ))}
            </div>
          ) : (
            <div
              className="text-center py-14 rounded-[1.25rem]"
              style={{
                background: "rgba(255,255,255,0.58)",
                border:     "1px solid rgba(255,255,255,0.80)",
                color:      "hsl(130 12% 50%)",
              }}
            >
              <p className="text-base font-semibold mb-1">{t("notes.empty.title")}</p>
              <p className="text-sm">{t("notes.empty.desc")}</p>
            </div>
          )}

          {/* ── MOBILE ONLY: panels stacked below the feed ─── */}
          <div className="md:hidden flex flex-col gap-4 mt-2">
            {/* لوحة الشرف */}
            <RightPanel
              gradient="linear-gradient(135deg,hsla(50,82%,86%,0.90),hsla(25,80%,84%,0.80))"
              icon={<Trophy size={15} className="text-amber-600" />}
              title="لوحة الشرف"
            >
              <HonorBoardContent lbLoading={lbLoading} leaderboard={leaderboard} />
            </RightPanel>
            {/* الأكثر تداولاً */}
            <RightPanel
              gradient="linear-gradient(135deg,hsla(130,42%,84%,0.90),hsla(170,42%,82%,0.80))"
              icon={<TrendingUp size={15} className="text-emerald-700" />}
              title="الأكثر تداولاً"
            >
              <TrendingPanelContent trendingLoading={trendingLoading} trendingNotes={trendingNotes} topNotes={topNotes} />
            </RightPanel>
          </div>

        </main>

        {/* ── RIGHT SIDEBAR (tablet/desktop only) ──────────── */}
        <aside className="hidden md:flex flex-col gap-4 w-[200px] lg:w-[268px] shrink-0 sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto" style={{ scrollbarWidth: "none" }}>

          {/* 1 ─ لوحة الشرف */}
          <RightPanel
            gradient="linear-gradient(135deg,hsla(50,82%,86%,0.90),hsla(25,80%,84%,0.80))"
            icon={<Trophy size={15} className="text-amber-600" />}
            title="لوحة الشرف"
          >
            <HonorBoardContent lbLoading={lbLoading} leaderboard={leaderboard} />
          </RightPanel>

          {/* 2 ─ الأكثر تداولاً */}
          <RightPanel
            gradient="linear-gradient(135deg,hsla(130,42%,84%,0.90),hsla(170,42%,82%,0.80))"
            icon={<TrendingUp size={15} className="text-emerald-700" />}
            title="الأكثر تداولاً"
          >
            <TrendingPanelContent
              trendingLoading={trendingLoading}
              trendingNotes={trendingNotes}
              topNotes={topNotes}
            />
          </RightPanel>

        </aside>

      </div>
    </div>
  );
}
