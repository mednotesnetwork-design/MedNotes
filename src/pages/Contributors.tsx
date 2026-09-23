import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, ArrowRight } from "lucide-react";
import { useGetLeaderboard, useGetLeaderboardChampions } from "@workspace/api-client-react";
import {
  PROGRESSION_RANK_META,
  TITLE_META,
  getBestTitle,
  getProgressionProgress,
  getNextRankThreshold,
  getProgressionRank,
  type ProgressionRankKey,
} from "@/lib/gamification";
import { TitleBadge } from "@/components/LevelAvatar";
import { RankFrame, RankBadgePill } from "@/components/RankFrame";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Sort options ───────────────────────────────────────────── */
type SortKey = "points" | "downloads" | "upvotes";
const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "points",    label: "الأعلى تصنيفًا", icon: "⭐" },
  { key: "upvotes",   label: "الأكثر مساهمةً", icon: "🔥" },
  { key: "downloads", label: "الأكثر تحميلًا", icon: "⬇"  },
];

/* ── Podium card palette for top-3 (visual decoration only) ── */
const TOP3_CARD = [
  {
    medalEmoji:  "🥇",
    cardBg:      "linear-gradient(135deg,rgba(255,250,210,0.78) 0%,rgba(255,240,160,0.36) 100%)",
    cardBorder:  "rgba(240,195,20,0.30)",
    barBg:       "linear-gradient(90deg,#C4900A,#FFD700,#F5C518)",
    barGlow:     "0 0 7px rgba(255,195,0,0.55),0 0 16px rgba(255,160,0,0.26)",
    badgeBg:     "linear-gradient(145deg,#8B6200,#D4A820,#FFE168,#D4A820,#8B6200)",
    badgeShadow: "0 2px 8px rgba(255,185,0,0.48)",
    textColor:   "#7A4E00",
    pad:         4,
  },
  {
    medalEmoji:  "🥈",
    cardBg:      "linear-gradient(135deg,rgba(224,240,254,0.68) 0%,rgba(198,218,238,0.30) 100%)",
    cardBorder:  "rgba(140,165,185,0.26)",
    barBg:       "linear-gradient(90deg,#607080,#A8C0D4,#9AB6C8)",
    barGlow:     "0 0 6px rgba(140,165,185,0.48),0 0 12px rgba(90,130,165,0.22)",
    badgeBg:     "linear-gradient(145deg,#344A58,#8BA4B8,#D8EAF4,#8BA4B8,#344A58)",
    badgeShadow: "0 2px 8px rgba(130,165,195,0.45)",
    textColor:   "#344858",
    pad:         3.5,
  },
  {
    medalEmoji:  "🥉",
    cardBg:      "linear-gradient(135deg,rgba(248,215,165,0.60) 0%,rgba(234,186,128,0.28) 100%)",
    cardBorder:  "rgba(196,128,48,0.24)",
    barBg:       "linear-gradient(90deg,#905200,#CD7F32,#D08830)",
    barGlow:     "0 0 6px rgba(196,118,40,0.48),0 0 12px rgba(155,78,20,0.22)",
    badgeBg:     "linear-gradient(145deg,#3C1800,#8C5018,#E8964A,#8C5018,#3C1800)",
    badgeShadow: "0 2px 8px rgba(195,118,38,0.44)",
    textColor:   "#563000",
    pad:         3.5,
  },
] as const;

/* ── Progress bar color per rank ────────────────────────────── */
const RANK_BAR: Record<string, string> = {
  beginner: "#4E8A59",
  bronze:   "#CD7F32",
  silver:   "#9ABCCE",
  gold:     "#F5C518",
  platinum: "#60C0F0",
  diamond:  "#A855F7",
  master:   "#F5C518",
};
const RANK_GLOW: Record<string, string> = {
  beginner: "0 0 6px rgba(78,138,89,0.40)",
  bronze:   "0 0 6px rgba(205,127,50,0.40)",
  silver:   "0 0 6px rgba(154,188,206,0.45)",
  gold:     "0 0 8px rgba(255,195,0,0.55)",
  platinum: "0 0 8px rgba(96,192,240,0.55)",
  diamond:  "0 0 8px rgba(168,85,247,0.55)",
  master:   "0 0 10px rgba(255,195,0,0.70),0 0 20px rgba(200,80,255,0.35)",
};

/* ── Medal badge for top 3 ──────────────────────────────────── */
function MedalBadge({ pos }: { pos: 0|1|2 }) {
  const t = TOP3_CARD[pos];
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: t.badgeBg, boxShadow: t.badgeShadow,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, flexShrink: 0,
      border: "1.5px solid rgba(255,255,255,0.35)",
    }}>
      {t.medalEmoji}
    </div>
  );
}

/* ── Numbered badge for positions 4+ ───────────────────────── */
function NumBadge({ n }: { n: number }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: "rgba(78,138,89,0.09)",
      border: "1px solid rgba(78,138,89,0.16)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 800, color: "hsl(130 30% 44%)", flexShrink: 0,
    }}>
      {n}
    </div>
  );
}

/* ── Skeleton row ───────────────────────────────────────────── */
function RowSkeleton({ big }: { big?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: big ? "14px 16px" : "10px 16px" }}>
      <Skeleton style={{ width: big ? 36 : 28, height: big ? 36 : 28, borderRadius: "50%", flexShrink: 0 }} />
      <Skeleton style={{ width: big ? 60 : 46, height: big ? 60 : 46, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <Skeleton style={{ height: 13, width: "55%", borderRadius: 99 }} />
        <Skeleton style={{ height: 10, width: "35%", borderRadius: 99 }} />
        <Skeleton style={{ height: 2.5, width: "80%", borderRadius: 99 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <Skeleton style={{ height: 13, width: 52, borderRadius: 99 }} />
        <Skeleton style={{ height: 9, width: 28, borderRadius: 99 }} />
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export function Contributors() {
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [search,  setSearch]  = useState("");

  /* Weekly leaderboard list for display, sorted by chosen metric */
  const { data: leaderboard, isLoading } = useGetLeaderboard({
    category: sortKey,
    period:   "weekly",
  });

  /* Champion map: authorName → titleKey (weekly winners) */
  const { data: champions } = useGetLeaderboardChampions();
  const championMap = new Map((champions ?? []).map((c) => [c.authorName, c.titleKey]));

  const filtered = useMemo(() => {
    if (!leaderboard) return [];
    if (!search.trim()) return leaderboard;
    const q = search.toLowerCase();
    return leaderboard.filter((e) => (e.authorName ?? "").toLowerCase().includes(q));
  }, [leaderboard, search]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 40px" }}>

      {/* ══ HEADER ═════════════════════════════════════════════ */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg,rgba(255,250,215,0.78) 0%,rgba(255,242,190,0.55) 50%,rgba(255,255,255,0.70) 100%)",
        border: "1px solid rgba(240,195,30,0.24)", borderRadius: 22,
        padding: "22px 20px 18px", marginBottom: 18,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 4px 28px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.85)",
      }}>
        <div style={{ position:"absolute",top:-40,right:-30,width:140,height:140,background:"radial-gradient(circle,rgba(255,200,0,0.16),transparent 70%)",borderRadius:"50%",pointerEvents:"none" }} />
        <div style={{ position:"absolute",bottom:-30,left:-20,width:100,height:100,background:"radial-gradient(circle,rgba(255,160,0,0.12),transparent 70%)",borderRadius:"50%",pointerEvents:"none" }} />

        <div style={{ position:"relative",display:"flex",alignItems:"flex-start",justifyContent:"space-between" }} dir="rtl">
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:4 }}>
              <span style={{ fontSize:28,filter:"drop-shadow(0 0 10px rgba(255,195,0,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.20))" }}>🏆</span>
              <h1 style={{ fontSize:22,fontWeight:900,color:"hsl(130 45% 14%)",letterSpacing:"-0.02em",lineHeight:1 }}>
                قائمة المتميزين
              </h1>
            </div>
            <p style={{ fontSize:12,color:"hsl(130 22% 50%)",fontWeight:500,marginRight:38 }}>
              أبطال منصة MedNotes — المتميزون في العطاء والمشاركة
            </p>
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0 }}>
            <Link href="/">
              <button style={{
                width:32,height:32,borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",
                background:"rgba(78,138,89,0.10)",border:"1px solid rgba(78,138,89,0.16)",
                color:"hsl(130 38% 38%)",cursor:"pointer",
              }}>
                <ArrowRight size={15} />
              </button>
            </Link>
            {!isLoading && (
              <span style={{
                fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:99,
                background:"rgba(78,138,89,0.12)",color:"hsl(130 38% 36%)",
                border:"1px solid rgba(78,138,89,0.14)",whiteSpace:"nowrap",
              }}>
                {filtered.length} مساهم
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══ SEARCH + SORT ══════════════════════════════════════ */}
      <div style={{ display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" }} dir="rtl">
        <div style={{
          display:"flex",alignItems:"center",gap:8,flex:"1 1 180px",minWidth:160,
          padding:"0 14px",height:40,
          background:"rgba(255,255,255,0.80)",backdropFilter:"blur(18px)",
          border:"1px solid rgba(255,255,255,0.90)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.05)",borderRadius:99,
        }}>
          <Search size={14} style={{ color:"hsl(130 18% 58%)",flexShrink:0 }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المساهم…" dir="rtl"
            style={{ flex:1,background:"transparent",border:"none",outline:"none",fontSize:13,color:"hsl(130 40% 20%)" }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ color:"hsl(130 18% 60%)",fontSize:12,lineHeight:1,background:"none",border:"none",cursor:"pointer" }}>
              ✕
            </button>
          )}
        </div>

        <div style={{
          display:"flex",alignItems:"center",gap:2,padding:4,
          background:"rgba(255,255,255,0.80)",backdropFilter:"blur(18px)",
          border:"1px solid rgba(255,255,255,0.90)",
          boxShadow:"0 2px 12px rgba(0,0,0,0.05)",borderRadius:99,flexShrink:0,
        }}>
          {SORT_OPTIONS.map((opt) => (
            <button key={opt.key} onClick={() => setSortKey(opt.key)} style={{
              fontSize:11,fontWeight:700,padding:"5px 11px",borderRadius:99,
              border:"none",cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.18s ease",
              ...(sortKey === opt.key
                ? { background:"linear-gradient(135deg,#4E8A59,#3B6E44)",color:"#fff",boxShadow:"0 2px 8px rgba(60,100,68,0.30)" }
                : { background:"transparent",color:"hsl(130 25% 48%)" }),
            }}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ LEADERBOARD LIST ════════════════════════════════════ */}
      <div style={{
        background:"rgba(255,255,255,0.72)",
        backdropFilter:"blur(22px)",WebkitBackdropFilter:"blur(22px)",
        border:"1px solid rgba(255,255,255,0.88)",
        boxShadow:"0 8px 36px rgba(0,0,0,0.07),inset 0 1px 0 rgba(255,255,255,0.95)",
        borderRadius:22,overflow:"visible",
      }}>
        {isLoading ? (
          <>
            <RowSkeleton big /><RowSkeleton big /><RowSkeleton big />
            <RowSkeleton /><RowSkeleton /><RowSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center",padding:"48px 20px",fontSize:13,color:"hsl(130 14% 54%)",fontWeight:500 }} dir="rtl">
            <div style={{ fontSize:32,marginBottom:10 }}>🔍</div>
            لا يوجد مساهمون بهذا الاسم
          </div>
        ) : filtered.map((entry, idx) => {
          const isTop3    = idx < 3;
          const t3        = isTop3 ? TOP3_CARD[idx as 0|1|2] : null;
          const bestTitle = getBestTitle(entry.titles);
          const pct       = getProgressionProgress(entry.points);
          const rank      = (entry.progressionRank as ProgressionRankKey)
                            ?? getProgressionRank(entry.points);
          const barColor  = RANK_BAR[rank]  ?? "#9CA3AF";
          const barGlow   = RANK_GLOW[rank] ?? "none";
          const nextPts   = getNextRankThreshold(entry.points);

          return (
            <div
              key={entry.authorName ?? idx}
              className="mdn-contrib-row"
              style={{
                display:"flex",alignItems:"center",gap:12,
                padding: isTop3 ? "15px 18px" : "10px 16px",
                borderBottom: idx < filtered.length - 1 ? "1px solid rgba(0,0,0,0.038)" : "none",
                background: isTop3 ? (t3?.cardBg ?? "transparent") : "transparent",
                borderLeft: isTop3 ? `3px solid ${t3?.cardBorder ?? "transparent"}` : "3px solid transparent",
              }}
            >
              {/* Medal / number */}
              {isTop3 ? <MedalBadge pos={idx as 0|1|2} /> : <NumBadge n={idx + 1} />}

              {/* Avatar + weekly champion title below */}
              {(() => {
                const champTitle = championMap.get(entry.authorName ?? "");
                const m = champTitle ? TITLE_META[champTitle as keyof typeof TITLE_META] : null;
                return (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flexShrink:0 }}>
                    <RankFrame
                      name={entry.authorName ?? "?"}
                      rank={rank}
                      size={isTop3 ? (idx === 0 ? 70 : 60) : 48}
                    />
                    {m && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 2,
                        fontSize: 8, fontWeight: 700, whiteSpace: "nowrap",
                        padding: "2px 6px", borderRadius: 99,
                        background: `${m.color}18`,
                        color: m.color,
                        border: `1px solid ${m.color}40`,
                        maxWidth: isTop3 ? (idx === 0 ? 70 : 60) : 48,
                        overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {m.icon} {m.titleAr}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Info block */}
              <div style={{ flex:1,minWidth:0 }}>
                {/* Name + rank badge */}
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }} dir="rtl">
                  <p style={{
                    fontSize: isTop3 ? 14 : 13, fontWeight:800,
                    color:"hsl(130 42% 15%)",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.2,
                  }}>
                    {entry.authorName}
                  </p>
                  <RankBadgePill rank={rank} size="xs" />
                </div>

                {/* Title badges */}
                {bestTitle && (
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:4 }}>
                    <TitleBadge titleKey={bestTitle} />
                    {entry.titles
                      .filter((k) => k !== bestTitle)
                      .slice(0, 1)
                      .map((k) => <TitleBadge key={k} titleKey={k} />)}
                  </div>
                )}

                {/* Progress bar */}
                <div style={{ height: isTop3 ? 3 : 2.5, background:"rgba(0,0,0,0.06)", borderRadius:99, marginTop: bestTitle ? 0 : 2 }}>
                  <div style={{
                    height:"100%", width:`${pct}%`, borderRadius:99,
                    background: isTop3 ? (t3?.barBg ?? barColor) : barColor,
                    boxShadow:  isTop3 ? (t3?.barGlow ?? barGlow) : barGlow,
                    transition:"width 0.8s cubic-bezier(0.34,1.2,0.64,1)",
                  }} />
                </div>

                {/* Points toward next rank */}
                {nextPts && (
                  <p style={{
                    fontSize:9,fontWeight:500,color:"hsl(130 14% 60%)",
                    marginTop:3, direction:"rtl",
                  }}>
                    {entry.points.toLocaleString()} / {nextPts.toLocaleString()} نقطة
                  </p>
                )}
              </div>

              {/* Points column */}
              <div style={{ textAlign:"right",flexShrink:0,minWidth: isTop3 ? 52 : 46 }} dir="rtl">
                <p style={{
                  fontSize: isTop3 ? 15 : 12, fontWeight:900,
                  color: isTop3 ? (t3?.textColor ?? "hsl(130 40% 20%)") : "hsl(130 40% 22%)",
                  letterSpacing:"-0.03em",lineHeight:1,
                }}>
                  {entry.points.toLocaleString()}
                </p>
                <p style={{ fontSize:9,fontWeight:500,color:"hsl(130 14% 56%)",marginTop:2 }}>نقطة</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ RANK LEGEND ════════════════════════════════════════ */}
      <div style={{
        marginTop:20, padding:"16px 18px",
        background:"rgba(255,255,255,0.60)",
        backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",
        border:"1px solid rgba(255,255,255,0.85)",
        boxShadow:"0 4px 18px rgba(0,0,0,0.05)",
        borderRadius:18,
      }}>
        <p style={{ fontSize:11,fontWeight:700,color:"hsl(130 30% 40%)",marginBottom:10 }} dir="rtl">
          🏅 إطارات الرانك — تعتمد على النقاط والنشاط
        </p>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }} dir="rtl">
          {(["beginner","bronze","silver","gold","platinum","diamond","master"] as ProgressionRankKey[]).map((r) => {
            const meta = PROGRESSION_RANK_META[r];
            return (
              <div key={r} style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"4px 10px",borderRadius:99,
                background:"rgba(0,0,0,0.03)",
                border:"1px solid rgba(0,0,0,0.07)",
              }}>
                <span style={{ fontSize:12 }}>{meta.icon}</span>
                <span style={{ fontSize:10,fontWeight:700,color:"hsl(130 35% 30%)" }}>{meta.labelAr}</span>
                <span style={{ fontSize:9,color:"hsl(130 15% 60%)",fontWeight:500 }}>
                  {meta.maxPts === null
                    ? `${meta.minPts.toLocaleString()}+`
                    : meta.minPts === 0 && meta.maxPts === 0
                    ? "0 نقطة"
                    : `${meta.minPts}–${meta.maxPts}`}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize:10,fontWeight:500,color:"hsl(130 14% 58%)",marginTop:10 }} dir="rtl">
          🔥 هالة اللهب = دخل لوحة المتميزين (بغض النظر عن الرانك)
        </p>
      </div>
    </div>
  );
}
