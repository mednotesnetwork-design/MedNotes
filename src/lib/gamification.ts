/* ── MedNotes Gamification ────────────────────────────────────── *
 *
 *  TWO separate systems:
 *
 *  1. PROGRESSION RANK — the user's global XP level (7 tiers)
 *     Drives the profile frame / ring visual.
 *
 *  2. TITLE SYSTEM — community identity earned by contribution type
 *     A user can hold multiple titles simultaneously.
 *     Displayed as badges under the username.
 *
 *  3. LEADERBOARD DISTINCTION — separate from rank.
 *     If a user appears in لوحة المتميزين → flame halo overlay is added
 *     ON TOP of their rank frame, regardless of their rank.
 *
 * ────────────────────────────────────────────────────────────── */

/* ════════════════════════════════════════════════════════════════
   1.  PROGRESSION RANK  (7 tiers, based on points only)
   ════════════════════════════════════════════════════════════════ */

export interface ProgressionRankMeta {
  label:   string;
  labelAr: string;
  icon:    string;
  color:   string;
  minPts:  number;
  maxPts:  number | null;
}

export const PROGRESSION_RANKS = [
  "beginner",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "master",
] as const;

export type ProgressionRankKey = typeof PROGRESSION_RANKS[number];

export const PROGRESSION_RANK_META: Record<ProgressionRankKey, ProgressionRankMeta> = {
  beginner: { label: "Beginner",  labelAr: "مبتدئ",      icon: "🌱", color: "#4E8A59", minPts: 0,    maxPts: 0    },
  bronze:   { label: "Bronze",    labelAr: "برونزي",     icon: "🥉", color: "#CD7F32", minPts: 1,    maxPts: 99   },
  silver:   { label: "Silver",    labelAr: "فضي",        icon: "🥈", color: "#A8A9AD", minPts: 100,  maxPts: 499  },
  gold:     { label: "Gold",      labelAr: "ذهبي",       icon: "🥇", color: "#FFD700", minPts: 500,  maxPts: 999  },
  platinum: { label: "Platinum",  labelAr: "بلاتينيوم",  icon: "💠", color: "#7DD3FC", minPts: 1000, maxPts: 2999 },
  diamond:  { label: "Diamond",   labelAr: "دايموند",    icon: "💎", color: "#A855F7", minPts: 3000, maxPts: 4999 },
  master:   { label: "Master",    labelAr: "ماستر",      icon: "👑", color: "#F5C518", minPts: 5000, maxPts: null },
};

/** Return the user's progression rank key given their total points. */
export function getProgressionRank(points: number): ProgressionRankKey {
  if (points >= 5000) return "master";
  if (points >= 3000) return "diamond";
  if (points >= 1000) return "platinum";
  if (points >= 500)  return "gold";
  if (points >= 100)  return "silver";
  if (points >= 1)    return "bronze";
  return "beginner";
}

/** 0–100 progress toward the next rank tier. */
export function getProgressionProgress(points: number): number {
  const thresholds = [0, 1, 100, 500, 1000, 3000, 5000, Infinity];
  for (let i = 0; i < thresholds.length - 1; i++) {
    const lo = thresholds[i]!;
    const hi = thresholds[i + 1]!;
    if (points < hi) {
      if (hi === Infinity) return 100;
      return Math.min(100, Math.round(((points - lo) / (hi - lo)) * 100));
    }
  }
  return 100;
}

/** Points needed for the next rank, or null if at max. */
export function getNextRankThreshold(points: number): number | null {
  const thresholds = [1, 100, 500, 1000, 3000, 5000];
  for (const t of thresholds) {
    if (points < t) return t;
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════
   2.  TITLE SYSTEM
   ════════════════════════════════════════════════════════════════ */

export interface TitleMeta {
  title:   string;
  titleAr: string;
  icon:    string;
  color:   string;
}

export const TITLE_META: Record<string, TitleMeta> = {
  top_ranked:       { title: "Top Ranked",       titleAr: "من الأعلى تصنيفًا",  icon: "🏆", color: "#C084FC" },
  batch_legend:     { title: "Batch Legend",     titleAr: "اسطورة الدفعة",      icon: "👑", color: "#FBBF24" },
  best_explainer:   { title: "Best Explainer",   titleAr: "افضل شارح",          icon: "🎙️", color: "#F43F5E" },
  summary_wizard:   { title: "Summary Wizard",   titleAr: "ملخصاته اسطورية",    icon: "✨", color: "#0EA5E9" },
  question_crafter: { title: "Question Crafter", titleAr: "اسئلته ذكية",        icon: "🎯", color: "#34D399" },
  top_contributor:  { title: "Top Contributor",  titleAr: "من اكبر المساهمين",  icon: "🔥", color: "#F59E0B" },
  final_savior:     { title: "Final Savior",     titleAr: "منقذ ليلة الفاينل",  icon: "⚡", color: "#818CF8" },
  lecture_catcher:  { title: "Lecture Catcher",  titleAr: "مفرغ متميز",         icon: "📝", color: "#22D3EE" },
};

export const TITLE_PRESTIGE_ORDER = [
  "top_ranked", "batch_legend", "best_explainer", "summary_wizard",
  "question_crafter", "top_contributor", "final_savior", "lecture_catcher",
];

export function getBestTitle(titles: string[]): string | null {
  if (!titles || titles.length === 0) return null;
  for (const key of TITLE_PRESTIGE_ORDER) {
    if (titles.includes(key)) return key;
  }
  return titles[0] ?? null;
}

/* ── Legacy aliases ──────────────────────────────────────────── */
/** @deprecated use TITLE_META */
export const RANK_META = TITLE_META;
/** @deprecated use getBestTitle */
export function getBestRank(ranks: string[]): string {
  return getBestTitle(ranks) ?? "final_savior";
}
/** @deprecated use getProgressionProgress */
export function getRankProgress(points: number): number {
  return getProgressionProgress(points);
}

/* ── Badge metadata (legacy) ──────────────────────────────────── */
interface BadgeInfo { icon: string; label: string; color: string; bg: string; }

export const BADGE_META: Record<string, BadgeInfo> = {
  "Top Contributor":    { icon: "🏆", label: "الأعلى مساهمةً",  color: "#D97706", bg: "hsla(40,90%,88%,0.85)" },
  "Best Explainer":     { icon: "💡", label: "أفضل شارح",        color: "#2563EB", bg: "hsla(220,90%,90%,0.85)" },
  "Anatomy Expert":     { icon: "🦴", label: "خبير تشريح",       color: "#059669", bg: "hsla(150,70%,86%,0.85)" },
  "Robbins Master":     { icon: "📚", label: "بطل روبنز",         color: "#7C3AED", bg: "hsla(270,70%,90%,0.85)" },
  "Verified Notes":     { icon: "✅", label: "ملاحظات موثقة",    color: "#0891B2", bg: "hsla(195,70%,88%,0.85)" },
  "Most Saved":         { icon: "🔖", label: "الأكثر حفظًا",     color: "#DB2777", bg: "hsla(330,70%,90%,0.85)" },
  "Rising Contributor": { icon: "⭐", label: "مساهم صاعد",       color: "#EA580C", bg: "hsla(25,85%,88%,0.85)" },
};

/* ── Points description ───────────────────────────────────────── */
export const POINT_RULES = [
  { action: "رفع ملاحظة",             pts: "+20" },
  { action: "إعجاب مستلم",           pts: "+2"  },
  { action: "حفظ مستلم",             pts: "+3"  },
  { action: "تنزيل مستلم",           pts: "+5"  },
  { action: "50 تنزيل على ملاحظة",  pts: "+30" },
  { action: "100 إعجاب على ملاحظة", pts: "+50" },
];

/* ── Session key ──────────────────────────────────────────────── */
export function getSessionKey(): string {
  const k = "mednotes_rater_key";
  let v = localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
  return v;
}

/* ── Collections ──────────────────────────────────────────────── */
export interface Collection {
  id: string; name: string; noteIds: number[]; createdAt: string;
}
const COL_KEY = "mednotes_collections";
export function getCollections(): Collection[] {
  try { return JSON.parse(localStorage.getItem(COL_KEY) ?? "[]"); } catch { return []; }
}
export function saveCollections(cols: Collection[]): void {
  localStorage.setItem(COL_KEY, JSON.stringify(cols));
}
export function createCollection(name: string): Collection {
  const col: Collection = { id: crypto.randomUUID(), name, noteIds: [], createdAt: new Date().toISOString() };
  saveCollections([...getCollections(), col]);
  return col;
}
export function addNoteToCollection(colId: string, noteId: number): void {
  saveCollections(getCollections().map((c) =>
    c.id === colId && !c.noteIds.includes(noteId) ? { ...c, noteIds: [...c.noteIds, noteId] } : c,
  ));
}
export function removeNoteFromCollection(colId: string, noteId: number): void {
  saveCollections(getCollections().map((c) =>
    c.id === colId ? { ...c, noteIds: c.noteIds.filter((id) => id !== noteId) } : c,
  ));
}

/* ── Follow system ────────────────────────────────────────────── */
const FOLLOWS_KEY = "mednotes_follows";
export function getFollowing(): string[] {
  try { return JSON.parse(localStorage.getItem(FOLLOWS_KEY) ?? "[]"); } catch { return []; }
}
export function isFollowing(authorName: string): boolean {
  return getFollowing().includes(authorName);
}
export function toggleFollow(authorName: string): boolean {
  const follows = getFollowing();
  const was = follows.includes(authorName);
  localStorage.setItem(FOLLOWS_KEY, JSON.stringify(was ? follows.filter(f => f !== authorName) : [...follows, authorName]));
  return !was;
}

/* ── Saved notes ──────────────────────────────────────────────── */
const SAVED_KEY = "mednotes_saved_notes";
export function getSavedNoteIds(): number[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}
export function toggleSavedNote(noteId: number): boolean {
  const saved = getSavedNoteIds();
  const was = saved.includes(noteId);
  localStorage.setItem(SAVED_KEY, JSON.stringify(was ? saved.filter(id => id !== noteId) : [...saved, noteId]));
  return !was;
}
