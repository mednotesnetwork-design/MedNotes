import { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { Heart, Download, Bookmark } from "lucide-react";
import { Document, Page } from "react-pdf";
import { useSaveNote } from "@workspace/api-client-react";
import { getSavedNoteIds, toggleSavedNote } from "@/lib/gamification";
import { RankFrame } from "@/components/RankFrame";
import { useLeaderboard } from "@/contexts/LeaderboardContext";

/* ── types ────────────────────────────────────────────────────── */

type FileFmt = "PDF" | "IMAGE" | "VIDEO" | "OTHER";

/* ── constants ────────────────────────────────────────────────── */

const CARD_INFO_BG = [
  "bg-card-peach",
  "bg-card-sage",
  "bg-card-rose",
  "bg-card-yellow",
  "bg-card-mint",
] as const;

const FILE_BADGE: Record<string, string> = {
  "ملخصات":  "bg-emerald-100/80 text-emerald-700",
  "تفريغات": "bg-blue-100/80   text-blue-700",
  "شروحات":  "bg-amber-100/80  text-amber-700",
  "أسئلة":   "bg-rose-100/80   text-rose-700",
};

/* pseudo-random heights for gradient placeholder blocks */
const PH_H = [158, 202, 178, 238, 167, 220, 193, 248, 174, 212];

const CAT_GRAD: Record<string, string> = {
  "ملخصات":  "135deg, hsla(130,42%,80%,0.70), hsla(160,40%,87%,0.65)",
  "تفريغات": "135deg, hsla(35, 82%,80%,0.70), hsla(48, 85%,88%,0.65)",
  "شروحات":  "135deg, hsla(212,60%,80%,0.70), hsla(228,62%,88%,0.65)",
  "أسئلة":   "135deg, hsla(348,58%,80%,0.70), hsla(328,54%,87%,0.65)",
};

/* ── helpers ──────────────────────────────────────────────────── */

function detectFmt(fileName: string | null | undefined): FileFmt {
  if (!fileName) return "OTHER";
  const n = fileName.toLowerCase();
  if (n.endsWith(".pdf")) return "PDF";
  if (n.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return "IMAGE";
  if (n.match(/\.(mp4|webm|mov|ogg|ogv|m4v)$/)) return "VIDEO";
  return "OTHER";
}

function gradOf(noteType: string): string {
  return CAT_GRAD[noteType] ?? "135deg, hsla(280,35%,82%,0.65), hsla(300,38%,89%,0.60)";
}

function toSingular(noteType: string | null | undefined): string {
  const s = (noteType ?? "").trim();
  if (!s) return s;
  const last = s.charCodeAt(s.length - 1);
  const prev = s.charCodeAt(s.length - 2);
  if (last === 0x062a && prev === 0x0627) {
    if (s.charCodeAt(0) === 0x0634) return "شرح";
    return s.slice(0, -2);
  }
  return s;
}

/* ── preview sub-components ───────────────────────────────────── */

function GradientBlock({
  noteId, noteType,
}: { noteId: number; noteType: string }) {
  const h = PH_H[noteId % PH_H.length];
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ height: h, background: `linear-gradient(${gradOf(noteType)})` }}
    >
      <span
        className="font-black select-none"
        style={{ fontSize: 54, opacity: 0.09, lineHeight: 1 }}
      >
        {noteType?.charAt(0) ?? "م"}
      </span>
    </div>
  );
}

function LazyPdfBlock({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.offsetWidth || 240);
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { rootMargin: "450px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full overflow-hidden bg-muted/10" style={{ minHeight: 158 }}>
      {visible && w > 0 ? (
        <Document
          file={src}
          loading={<div className="bg-muted/20 animate-pulse" style={{ height: 180 }} />}
          error={<div className="bg-muted/10" style={{ height: 158 }} />}
        >
          <Page
            pageNumber={1}
            width={w}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      ) : (
        <div className="bg-muted/20 animate-pulse" style={{ height: 158 }} />
      )}
    </div>
  );
}

function LazyImgBlock({ src }: { src: string }) {
  return (
    <div className="w-full overflow-hidden">
      <img
        src={src}
        alt=""
        loading="lazy"
        className="w-full object-cover"
        style={{ maxHeight: 280 }}
      />
    </div>
  );
}

function VideoBlock({ noteId, noteType }: { noteId: number; noteType: string }) {
  const h = PH_H[noteId % PH_H.length];
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ height: h, background: `linear-gradient(${gradOf(noteType)})` }}
    >
      <div className="w-11 h-11 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function NotePreview({
  fileUrl, fileName, noteType, noteId,
}: {
  fileUrl?: string | null;
  fileName?: string | null;
  noteType?: string | null;
  noteId: number;
}) {
  const fmt = detectFmt(fileName);
  const isGcs = fileUrl?.startsWith("/objects/");
  const src = isGcs ? `/api/storage${fileUrl}` : null;
  const nt = noteType ?? "";

  if (src && fmt === "PDF")   return <LazyPdfBlock src={src} />;
  if (src && fmt === "IMAGE") return <LazyImgBlock src={src} />;
  if (src && fmt === "VIDEO") return <VideoBlock noteId={noteId} noteType={nt} />;
  return <GradientBlock noteId={noteId} noteType={nt} />;
}

/* ── NoteCard ─────────────────────────────────────────────────── */

export interface NoteCardProps {
  id: number;
  title: string;
  universityName?: string | null;
  moduleName?: string | null;
  authorName?: string | null;
  fileType?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  upvotes: number;
  downloads: number;
  saves?: number;
  tags?: string[] | string | null;
  colorIndex?: number;
}

export function NoteCard({
  id, title, authorName,
  fileType, fileUrl, fileName,
  upvotes, downloads, saves = 0, colorIndex = 0,
}: NoteCardProps) {
  const infoBg   = CARD_INFO_BG[colorIndex % CARD_INFO_BG.length];
  const ft       = fileType?.trim() ?? "";
  const badgeCls = FILE_BADGE[ft] ?? "bg-gray-100/70 text-gray-500";

  const [savedLocally, setSavedLocally] = useState(() => getSavedNoteIds().includes(id));
  const [saveCount, setSaveCount]       = useState(saves);
  const { mutate: doSave }              = useSaveNote();

  /* ── author rank from shared leaderboard context (never flickers) ── */
  const { getRank } = useLeaderboard();
  const authorRank  = getRank(authorName);

  return (
    <Link href={`/notes/${id}`} className="block group">
      <article className="rounded-[1.1rem] overflow-hidden bg-white shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">

        {/* ── preview (top, variable height) ────────────────────── */}
        <NotePreview
          fileUrl={fileUrl}
          fileName={fileName}
          noteType={ft}
          noteId={id}
        />

        {/* ── info (bottom, pastel gradient) ────────────────────── */}
        <div className={`${infoBg} px-3 py-2.5`}>

          {/* type badge */}
          {ft && (
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${badgeCls}`}>
              {toSingular(ft)}
            </span>
          )}

          {/* title */}
          <h3
            className="font-bold leading-snug line-clamp-2 mb-1"
            style={{ fontSize: "0.82rem", color: "hsl(130 42% 12%)" }}
            dir="rtl"
          >
            {title}
          </h3>

          {/* author */}
          <div className="flex items-center gap-1.5 mb-2" dir="rtl">
            {authorName && (
              <RankFrame
                name={authorName}
                rank={authorRank}
                size={28}
              />
            )}
            <p
              className="truncate"
              style={{ fontSize: "0.70rem", color: "hsl(130 18% 50%)" }}
            >
              {authorName ?? "مجهول"}
            </p>
          </div>

          {/* stats + save button */}
          <div
            className="flex items-center gap-2.5 pt-1.5"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.55)",
              fontSize: "0.70rem",
            }}
          >
            <span className="flex items-center gap-1 font-semibold text-rose-500">
              <Heart size={10} fill="currentColor" /> {upvotes}
            </span>
            <span
              className="flex items-center gap-1 font-semibold"
              style={{ color: "hsl(145 45% 40%)" }}
            >
              <Download size={10} /> {downloads}
            </span>
            <button
              className="flex items-center gap-1 font-semibold ml-auto transition-colors"
              style={{ color: savedLocally ? "hsl(220 70% 52%)" : "hsl(130 14% 60%)" }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const nowSaved = !savedLocally;
                setSavedLocally(nowSaved);
                setSaveCount((c) => c + (nowSaved ? 1 : -1));
                toggleSavedNote(id);
                if (nowSaved) doSave({ id });
              }}
              title={savedLocally ? "إزالة من المحفوظات" : "حفظ"}
            >
              <Bookmark size={10} fill={savedLocally ? "currentColor" : "none"} />
              {saveCount > 0 && saveCount}
            </button>
          </div>

        </div>
      </article>
    </Link>
  );
}
