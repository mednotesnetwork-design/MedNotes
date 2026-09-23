import React, { useState, useRef, useCallback, useEffect } from "react";
import { getFile } from "@/lib/idb";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft, Download, ThumbsUp, Calendar, User, BookOpen,
  Layers, GraduationCap, FileText, Share2, Paperclip, Pencil,
  Trash2, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut,
  FileSpreadsheet, Presentation, File as FileIcon, Play, Pause, SkipBack,
  SkipForward, Volume2, VolumeX, PictureInPicture2, Video,
  Search, Bookmark, BookmarkCheck, X, ChevronLeft, ChevronRight,
  Check
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  useGetNote, useUpvoteNote, useUpdateNote, useDeleteNote,
  useGetNoteRating, useRateNote,
  getGetNoteQueryKey, getListNotesQueryKey,
  useGetLeaderboard,
} from "@workspace/api-client-react";
import { getSessionKey, getProgressionRank } from "@/lib/gamification";
import type { ProgressionRankKey } from "@/lib/gamification";
import { RankFrame, RankBadgePill } from "@/components/RankFrame";
import { useXpGain } from "@/hooks/use-xp-gain";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

function toSingularLabel(noteType: string | null | undefined): string {
  const s = (noteType ?? "").trim();
  if (!s) return s;
  const last = s.charCodeAt(s.length - 1);
  const prev = s.charCodeAt(s.length - 2);
  if (last === 0x062A && prev === 0x0627) {
    if (s.charCodeAt(0) === 0x0634) return "\u0634\u0631\u062D";
    return s.slice(0, -2);
  }
  return s;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type FileFormat = "PDF" | "DOCX" | "PPTX" | "Image" | "Video" | "FILE";

function detectFormat(fileName: string | null | undefined): FileFormat {
  if (!fileName) return "FILE";
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "DOCX";
  if (name.endsWith(".pptx") || name.endsWith(".ppt")) return "PPTX";
  if (name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return "Image";
  if (name.match(/\.(mp4|webm|mov|ogg|ogv|m4v|mkv|avi)$/)) return "Video";
  return "FILE";
}

function FileTypeIcon({ format, size = 22 }: { format: FileFormat; size?: number }) {
  if (format === "DOCX") return <FileText size={size} className="text-blue-500" />;
  if (format === "PPTX") return <Presentation size={size} className="text-orange-500" />;
  if (format === "Image") return <FileSpreadsheet size={size} className="text-emerald-500" />;
  if (format === "Video") return <Video size={size} className="text-purple-500" />;
  return <FileIcon size={size} className="text-muted-foreground" />;
}

function FileTypeBadgeColor(format: FileFormat) {
  if (format === "PDF") return "bg-red-100 text-red-700 border-red-200";
  if (format === "DOCX") return "bg-blue-100 text-blue-700 border-blue-200";
  if (format === "PPTX") return "bg-orange-100 text-orange-700 border-orange-200";
  if (format === "Image") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (format === "Video") return "bg-purple-100 text-purple-700 border-purple-200";
  return "bg-muted text-muted-foreground border-border";
}

/* ─── Scribd-style PDF Viewer ────────────────────────────── */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ScribdPdfViewer({
  src,
  fileName,
  fileSize,
  noteId,
  onDownload,
  downloading,
}: {
  src: string;
  fileName: string | null | undefined;
  fileSize: number | null | undefined;
  noteId: number;
  onDownload: () => void;
  downloading: boolean;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [containerWidth, setContainerWidth] = useState(760);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [shared, setShared] = useState(false);
  const { toast: svToast } = useToast();

  /* ── measure container width for responsive page sizing ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /* ── fullscreen sync ── */
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  /* ── bookmark initial state ── */
  useEffect(() => {
    const bm: number[] = JSON.parse(
      localStorage.getItem("mednotes-bookmarks") ?? "[]"
    );
    setIsBookmarked(bm.includes(noteId));
  }, [noteId]);

  /* ── IntersectionObserver: track visible page ── */
  useEffect(() => {
    if (!numPages || !scrollRef.current) return;
    const root = scrollRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        let best = { ratio: 0, page: currentPage };
        entries.forEach((e) => {
          if (e.intersectionRatio > best.ratio) {
            best = {
              ratio: e.intersectionRatio,
              page: parseInt(e.target.getAttribute("data-page") ?? "1"),
            };
          }
        });
        if (best.ratio > 0) {
          setCurrentPage(best.page);
          setPageInput(String(best.page));
        }
      },
      { root, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    pageRefs.current.forEach((r) => r && obs.observe(r));
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages]);

  /* ── open search bar and focus ── */
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 80);
  }, []);

  /* ── jump to page ── */
  const goToPage = useCallback(
    (p: number) => {
      const target = Math.max(1, Math.min(numPages, p));
      setCurrentPage(target);
      setPageInput(String(target));
      pageRefs.current[target - 1]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [numPages]
  );

  const commitPageInput = useCallback(() => {
    const n = parseInt(pageInput);
    if (!isNaN(n)) goToPage(n);
  }, [pageInput, goToPage]);

  /* ── bookmark toggle ── */
  const toggleBookmark = useCallback(() => {
    const bm: number[] = JSON.parse(
      localStorage.getItem("mednotes-bookmarks") ?? "[]"
    );
    const updated = isBookmarked
      ? bm.filter((id) => id !== noteId)
      : [...bm, noteId];
    localStorage.setItem("mednotes-bookmarks", JSON.stringify(updated));
    setIsBookmarked(!isBookmarked);
  }, [isBookmarked, noteId]);

  /* ── share — native share sheet, copy-link fallback on unsupported devices ── */
  const handleShare = useCallback(async () => {
    const noteUrl = window.location.href;
    const title = "MedNotes";
    const text = "شوف هذه الملاحظة على MedNotes";
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: noteUrl });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    // Fallback: copy link to clipboard
    navigator.clipboard.writeText(noteUrl).then(() => {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
      svToast({ title: "تم نسخ الرابط" });
    });
  }, [svToast]);

  /* ── fullscreen ── */
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await outerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  /* ── text search highlight ── */
  const customTextRenderer = useCallback(
    ({ str }: { str: string }) => {
      const q = searchText.trim();
      if (!q) return str;
      const re = new RegExp(`(${escapeRegex(q)})`, "gi");
      return str.replace(
        re,
        `<mark style="background:#fbbf24;color:#111;border-radius:2px;padding:0 1px">$1</mark>`
      );
    },
    [searchText]
  );

  /* ── derived ── */
  const pageWidth = Math.min(Math.max(containerWidth - 32, 300), 960);
  const viewerHeight = isFullscreen
    ? "calc(100vh - 108px)"
    : "clamp(420px, 85vh, calc(100vh - 220px))";

  const iconBtn =
    "inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors";

  return (
    <div
      ref={outerRef}
      className="rounded-2xl border border-border/50 overflow-hidden bg-white shadow-sm"
    >
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur border-b border-border/40 shadow-sm">
        {/* Left: badge + name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border bg-red-100 text-red-700 border-red-200 shrink-0 uppercase">
            PDF
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {fileName}
          </span>
          {fileSize && (
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
              {formatBytes(fileSize)}
            </span>
          )}
        </div>

        {/* Center: page navigation */}
        {numPages > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              className={iconBtn}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              title="الصفحة السابقة"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1 text-xs">
              <input
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitPageInput()}
                onBlur={commitPageInput}
                className="w-10 text-center border border-border/60 rounded-md px-1 py-0.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                aria-label="رقم الصفحة"
              />
              <span className="text-muted-foreground select-none">
                / {numPages}
              </span>
            </div>
            <button
              className={iconBtn}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              title="الصفحة التالية"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Right: actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            className={`${iconBtn} ${searchOpen ? "bg-amber-50 text-amber-600" : ""}`}
            onClick={searchOpen ? () => setSearchOpen(false) : openSearch}
            title="بحث في الملف"
          >
            <Search size={15} />
          </button>
          <button
            className={iconBtn}
            onClick={toggleBookmark}
            title={isBookmarked ? "إزالة الإشارة المرجعية" : "حفظ كإشارة مرجعية"}
          >
            {isBookmarked ? (
              <BookmarkCheck size={15} className="text-primary" />
            ) : (
              <Bookmark size={15} />
            )}
          </button>
          <button
            className={iconBtn}
            onClick={handleShare}
            title="مشاركة"
          >
            {shared ? (
              <Check size={15} className="text-emerald-600" />
            ) : (
              <Share2 size={15} />
            )}
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={iconBtn}
            title="فتح في تبويب جديد"
          >
            <ExternalLink size={15} />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ml-1 disabled:opacity-70"
          >
            {downloading
              ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Download size={13} />}
            {downloading ? "جاري..." : "تحميل"}
          </button>
          <button
            className={`${iconBtn} ml-0.5`}
            onClick={toggleFullscreen}
            title={isFullscreen ? "خروج من الشاشة الكاملة" : "شاشة كاملة"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200/60">
          <Search size={14} className="text-amber-600 shrink-0" />
          <input
            ref={searchRef}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="ابحث في نص الملف..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-amber-500/70"
            dir="auto"
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="text-amber-500 hover:text-amber-700 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* ── PDF scroll area ── */}
      <div
        ref={scrollRef}
        className="overflow-y-auto bg-[#e8e8e8]"
        style={{ height: viewerHeight }}
      >
        <Document
          file={src}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            pageRefs.current = new Array(n).fill(null);
          }}
          loading={
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">جاري تحميل الملف...</span>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <span className="text-red-500 text-sm font-medium">
                تعذّر تحميل الملف. تأكد من أن الملف متاح وأعد المحاولة.
              </span>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
              >
                فتح في تبويب جديد
              </a>
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i + 1}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              data-page={i + 1}
              className="flex justify-center py-2 px-4"
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer
                renderAnnotationLayer
                customTextRenderer={customTextRenderer}
                className="shadow-lg"
              />
            </div>
          ))}
        </Document>
      </div>

      {/* ── Bottom page indicator ── */}
      {numPages > 0 && (
        <div className="flex items-center justify-center py-2 bg-white border-t border-border/30">
          <span className="text-xs text-muted-foreground font-mono">
            {currentPage} / {numPages}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Image Viewer ───────────────────────────────────────── */
function ImageViewer({
  src,
  fileName,
  fileSize,
  onDownload,
  downloading,
}: {
  src: string;
  fileName: string | null | undefined;
  fileSize: number | null | undefined;
  onDownload: () => void;
  downloading: boolean;
}) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-muted/10">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-md border ${FileTypeBadgeColor("Image")}`}
          >
            صورة
          </span>
          <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
          {fileSize && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatBytes(fileSize)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {downloading
              ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Download size={13} />}
            {downloading ? "جاري..." : "تحميل"}
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
          >
            <ExternalLink size={13} /> فتح في تبويب
          </a>
          <button
            onClick={() => setZoomed((z) => !z)}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
            title={zoomed ? "تصغير" : "تكبير"}
          >
            {zoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className={`flex items-center justify-center bg-muted/20 p-4 transition-all duration-300 ${
          zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
        onClick={() => setZoomed((z) => !z)}
      >
        <img
          src={src}
          alt={fileName ?? "image"}
          className={`rounded-xl object-contain transition-all duration-300 ${
            zoomed ? "max-h-none w-full" : "max-h-[70vh] w-auto max-w-full"
          }`}
          draggable={false}
        />
      </div>
    </div>
  );
}

/* ─── Document Card (Word / PowerPoint / generic) ────────── */
function DocumentCard({
  src,
  fileName,
  fileSize,
  format,
  onDownload,
  downloading,
}: {
  src: string;
  fileName: string | null | undefined;
  fileSize: number | null | undefined;
  format: FileFormat;
  onDownload: () => void;
  downloading: boolean;
}) {
  const label =
    format === "DOCX"
      ? "Word Document"
      : format === "PPTX"
      ? "PowerPoint Presentation"
      : "ملف";

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/10 p-6">
      <div className="flex items-center gap-5">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-background border border-border/50 shadow-sm flex items-center justify-center shrink-0">
          <FileTypeIcon format={format} size={28} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-base truncate text-foreground mb-1">
            {fileName ?? "ملف"}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md border ${FileTypeBadgeColor(format)}`}
            >
              {format}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
            {fileSize && (
              <span className="text-xs text-muted-foreground">· {formatBytes(fileSize)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            disabled={downloading}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {downloading
              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Download size={15} />}
            {downloading ? "جاري التحميل..." : "تحميل"}
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-border/60 hover:bg-muted/50 transition-colors"
          >
            <ExternalLink size={15} /> فتح
          </a>
        </div>
      </div>

      {/* Info notice for Office files */}
      {(format === "DOCX" || format === "PPTX") && (
        <p className="mt-4 text-xs text-muted-foreground bg-muted/40 rounded-xl px-4 py-2.5" dir="rtl">
          لعرض هذا الملف داخل المتصفح، افتحه في تبويب جديد أو قم بتحميله.
        </p>
      )}
    </div>
  );
}

/* ─── Video Player ───────────────────────────────────────── */
const SPEED_STORAGE_KEY = "mednotes-playback-speed";
const VIDEO_SPEEDS = [0.5, 1, 1.5, 2, 3];

function videoTsKey(noteId: number) {
  return `mednotes-video-ts-${noteId}`;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function VideoViewer({
  src,
  fileName,
  fileSize,
  noteId,
  onDownload,
  downloading,
}: {
  src: string;
  fileName: string | null | undefined;
  fileSize: number | null | undefined;
  noteId: number;
  onDownload: () => void;
  downloading: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [speed, setSpeed] = useState<number>(() => {
    const stored = parseFloat(localStorage.getItem(SPEED_STORAGE_KEY) ?? "1");
    return VIDEO_SPEEDS.includes(stored) ? stored : 1;
  });

  // Restore speed + saved timestamp once metadata is known
  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    v.playbackRate = speed;
    const saved = parseFloat(localStorage.getItem(videoTsKey(noteId)) ?? "0");
    if (saved > 2 && saved < v.duration - 5) {
      v.currentTime = saved;
    }
  }, [noteId, speed]);

  // Persist timestamp every 5 s while playing
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const start = () => {
      saveTimerRef.current = setInterval(() => {
        if (v.currentTime > 0)
          localStorage.setItem(videoTsKey(noteId), String(v.currentTime));
      }, 5000);
    };
    const stop = () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (v.currentTime > 0)
        localStorage.setItem(videoTsKey(noteId), String(v.currentTime));
    };
    v.addEventListener("play", start);
    v.addEventListener("pause", stop);
    v.addEventListener("ended", stop);
    return () => {
      v.removeEventListener("play", start);
      v.removeEventListener("pause", stop);
      v.removeEventListener("ended", stop);
      stop();
    };
  }, [noteId]);

  // Fullscreen sync
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // Close speed menu on outside click
  useEffect(() => {
    if (!showSpeedMenu) return;
    const h = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node))
        setShowSpeedMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSpeedMenu]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const seek = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  }, []);

  const applySpeed = useCallback((s: number) => {
    setSpeed(s);
    localStorage.setItem(SPEED_STORAGE_KEY, String(s));
    if (videoRef.current) videoRef.current.playbackRate = s;
    setShowSpeedMenu(false);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const togglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {/* browser may deny PiP */ }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !isFinite(v.duration)) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const ctrlBtn =
    "inline-flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors px-2 py-1.5 text-xs font-medium";

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-border/50 overflow-hidden bg-black"
    >
      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold px-2 py-0.5 rounded-md border bg-purple-100 text-purple-700 border-purple-200">
            VIDEO
          </span>
          <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
          {fileSize && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatBytes(fileSize)}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-70"
        >
          {downloading
            ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Download size={13} />}
          {downloading ? "جاري..." : "تحميل"}
        </button>
      </div>

      {/* ── Video element ── */}
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video bg-black cursor-pointer block"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
        preload="metadata"
        playsInline
      />

      {/* ── Custom controls ── */}
      <div className="bg-gray-950 px-4 pt-3 pb-3 flex flex-col gap-2.5 select-none">

        {/* Progress bar */}
        <div
          ref={progressBarRef}
          className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full transition-none"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `${progressPct}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        {/* Button row */}
        <div className="flex items-center gap-1">
          {/* Rewind 10s */}
          <button
            className={ctrlBtn}
            onClick={() => seek(-10)}
            title="تراجع ١٠ ثواني"
          >
            <SkipBack size={15} />
            <span className="text-[10px] leading-none">10</span>
          </button>

          {/* Play / Pause */}
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-gray-900 hover:bg-white/90 transition-colors shadow mx-1"
            onClick={togglePlay}
            title={playing ? "إيقاف مؤقت" : "تشغيل"}
          >
            {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>

          {/* Forward 10s */}
          <button
            className={ctrlBtn}
            onClick={() => seek(10)}
            title="تقدم ١٠ ثواني"
          >
            <span className="text-[10px] leading-none">10</span>
            <SkipForward size={15} />
          </button>

          {/* Time */}
          <span className="text-white/60 text-xs font-mono ml-2 shrink-0">
            {fmtTime(currentTime)}{" "}
            <span className="text-white/30">/</span>{" "}
            {fmtTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <button className={ctrlBtn} onClick={toggleMute} title={muted ? "رفع الصوت" : "كتم"}>
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Speed */}
          <div ref={speedMenuRef} className="relative">
            <button
              className={`${ctrlBtn} gap-0.5 min-w-[42px]`}
              onClick={() => setShowSpeedMenu((v) => !v)}
              title="سرعة التشغيل"
            >
              <span>{speed === 1 ? "1×" : `${speed}×`}</span>
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-1.5 bg-gray-900 border border-white/10 rounded-xl py-1 shadow-xl z-50 min-w-[72px]">
                {VIDEO_SPEEDS.map((s) => (
                  <button
                    key={s}
                    className={`w-full text-center text-xs px-3 py-1.5 transition-colors ${
                      s === speed
                        ? "text-primary font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                    onClick={() => applySpeed(s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Picture-in-Picture */}
          <button
            className={ctrlBtn}
            onClick={togglePiP}
            title="صورة داخل صورة"
          >
            <PictureInPicture2 size={15} />
          </button>

          {/* Fullscreen */}
          <button
            className={ctrlBtn}
            onClick={toggleFullscreen}
            title={isFullscreen ? "خروج من الشاشة الكاملة" : "شاشة كاملة"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Rating widget ────────────────────────────────────────── */
const RATING_DIMENSIONS = [
  { key: "organized",    label: "منظمة",            icon: "📐" },
  { key: "clear",        label: "واضحة",             icon: "💡" },
  { key: "comprehensive",label: "شاملة",             icon: "📚" },
  { key: "examReady",    label: "جاهزة للامتحان",    icon: "🎯" },
] as const;
type RatingKey = typeof RATING_DIMENSIONS[number]["key"];

const RATED_STORAGE_KEY = (id: number) => `mednotes_rated_${id}`;

function NoteRatingWidget({ noteId }: { noteId: number }) {
  const raterKey = getSessionKey();
  useGetNoteRating(noteId);
  const rateMutation = useRateNote();

  const savedRaw = typeof window !== "undefined"
    ? localStorage.getItem(RATED_STORAGE_KEY(noteId))
    : null;
  const savedRating = savedRaw ? JSON.parse(savedRaw) as Partial<Record<RatingKey, boolean>> : null;

  const [local, setLocal] = useState<Partial<Record<RatingKey, boolean>>>(savedRating ?? {});
  const [submitted, setSubmitted] = useState(!!savedRating);

  const toggle = (key: RatingKey) => {
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
    setSubmitted(false);
  };

  const handleSubmit = () => {
    localStorage.setItem(RATED_STORAGE_KEY(noteId), JSON.stringify(local));
    rateMutation.mutate({
      id: noteId,
      data: {
        raterKey,
        organized:     local.organized     ? 1 : 0,
        clear:         local.clear         ? 1 : 0,
        comprehensive: local.comprehensive ? 1 : 0,
        examReady:     local.examReady     ? 1 : 0,
      },
    });
    setSubmitted(true);
  };

  return (
    <div
      className="rounded-2xl p-4 mt-2"
      style={{
        background: "linear-gradient(135deg, hsla(130,42%,84%,0.45), hsla(50,80%,88%,0.35))",
        border: "1px solid rgba(255,255,255,0.75)",
      }}
      dir="rtl"
    >
      <p className="text-sm font-bold mb-3" style={{ color: "hsl(130 42% 18%)" }}>
        قيّم هذه الملاحظة
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {RATING_DIMENSIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: local[key]
                ? "linear-gradient(135deg, #86C98D, #4A9A55)"
                : "rgba(255,255,255,0.70)",
              color: local[key] ? "white" : "hsl(130 32% 36%)",
              border: `1px solid ${local[key] ? "transparent" : "rgba(78,138,89,0.22)"}`,
              boxShadow: local[key] ? "0 2px 8px rgba(74,154,85,0.30)" : "none",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>
      {!submitted ? (
        <Button
          size="sm"
          className="rounded-full px-5"
          onClick={handleSubmit}
          disabled={rateMutation.isPending}
        >
          <Check size={13} className="ml-1" /> إرسال التقييم
        </Button>
      ) : (
        <p className="text-xs font-semibold" style={{ color: "hsl(130 42% 34%)" }}>
          ✅ شكراً على تقييمك!
        </p>
      )}
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export function NoteDetail() {
  const [, params] = useRoute("/notes/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { triggerXp, XpPortal } = useXpGain();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");

  const { data: note, isLoading, isError } = useGetNote(id, {
    query: { enabled: !!id, queryKey: getGetNoteQueryKey(id) },
  });
  const { data: leaderboard } = useGetLeaderboard({ category: "points", period: "all" });

  const authorEntry = (leaderboard ?? []).find(
    (e) => e.authorName === note?.authorName
  );
  const authorRank: ProgressionRankKey =
    (authorEntry?.progressionRank as ProgressionRankKey | undefined) ??
    getProgressionRank(authorEntry?.points ?? 0);
  const authorOnLeaderboard = !!authorEntry;

  const upvoteMutation = useUpvoteNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fileUrl = note?.fileUrl;
    if (!fileUrl?.startsWith("idb:")) return;
    const fileId = fileUrl.slice(4);
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setFileNotFound(false);
    getFile(fileId).then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } else {
        setFileNotFound(true);
      }
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [note?.fileUrl]);

  const upvoteBtnRef = useRef<HTMLButtonElement>(null);
  const handleUpvote = () => {
    if (!note) return;
    upvoteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.setQueryData(getGetNoteQueryKey(id), (old: any) =>
          old ? { ...old, upvotes: old.upvotes + 1 } : old
        );
        triggerXp(2, upvoteBtnRef.current);
        toast({ title: t("noteDetail.upvoted"), description: t("noteDetail.upvotedDesc") });
      },
    });
  };

  const openEdit = () => {
    if (!note) return;
    setEditTitle(note.title);
    setEditDescription(note.description ?? "");
    setEditTags(note.tags ?? "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    try {
      await updateNote.mutateAsync({
        id,
        data: { title: editTitle, description: editDescription, tags: editTags },
      });
      queryClient.invalidateQueries({ queryKey: getGetNoteQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      setEditOpen(false);
      toast({ title: "تم التعديل بنجاح ✓" });
    } catch {
      toast({ title: "فشل التعديل", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      toast({ title: "تم الحذف بنجاح" });
      setLocation("/notes");
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" });
    }
  };

  /* ── native share for the bottom share button ── */
  const handleNoteShare = useCallback(async () => {
    const noteUrl = window.location.href;
    const title = note?.title ?? "MedNotes";
    const text = "شوف هذه الملاحظة على MedNotes";

    if (typeof navigator.share === "function") {
      try {
        const rawUrl = note?.fileUrl;
        const fileSize = note?.fileSize ?? 0;
        // Try to share the file itself for small-enough storage files
        if (
          rawUrl?.startsWith("/objects/") &&
          fileSize > 0 && fileSize <= 50 * 1024 * 1024 &&
          typeof navigator.canShare === "function"
        ) {
          try {
            const resp = await fetch(`/api/notes/${id}/download-file`);
            if (resp.ok) {
              const blob = await resp.blob();
              const fName = note?.fileName ?? "MedNotes-file";
              const file = new File([blob], fName, { type: blob.type });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title, text });
                return;
              }
            }
          } catch {
            /* file fetch failed — fall through to URL-only share */
          }
        }
        await navigator.share({ title, text, url: noteUrl });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    // Fallback: copy link to clipboard
    navigator.clipboard.writeText(noteUrl).then(() => {
      toast({ title: "تم نسخ الرابط" });
    });
  }, [note?.title, note?.fileUrl, note?.fileName, note?.fileSize, id, toast]);

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    const rawUrl = note?.fileUrl;
    if (!rawUrl || rawUrl === "#") return;

    const name = note?.fileName ?? "MedNotes-file";

    if (rawUrl.startsWith("idb:")) {
      // Local IndexedDB file — use existing blob URL directly
      if (!blobUrl) return;
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Track count separately for IDB files
      setDownloading(true);
      try {
        const r = await fetch(`/api/notes/${id}/download`, { method: "POST" });
        if (r.ok) queryClient.setQueryData(getGetNoteQueryKey(id), await r.json());
      } finally {
        setDownloading(false);
      }
      return;
    }

    if (rawUrl.startsWith("/objects/")) {
      // Storage file — use the dedicated download-file endpoint.
      // The server sets Content-Disposition: attachment so the browser
      // triggers a native download without navigating away.
      const a = document.createElement("a");
      a.href = `/api/notes/${id}/download-file`;
      a.download = name;          // hint for filename; server header takes precedence
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Optimistically update count in UI then re-sync from server
      queryClient.setQueryData(getGetNoteQueryKey(id), (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const o = old as Record<string, unknown>;
        return { ...o, downloads: (typeof o.downloads === "number" ? o.downloads : 0) + 1 };
      });
      setDownloading(true);
      try {
        // Brief delay lets the download start, then we confirm with server
        await new Promise((r) => setTimeout(r, 1500));
        await queryClient.invalidateQueries({ queryKey: getGetNoteQueryKey(id) });
      } finally {
        setDownloading(false);
      }
    }
  }, [downloading, note?.fileUrl, note?.fileName, blobUrl, id, queryClient]);

  if (isLoading)
    return <div className="container py-24 text-center">{t("noteDetail.loading")}</div>;
  if (isError || !note)
    return <div className="container py-24 text-center">{t("noteDetail.notFound")}</div>;

  const fileFormat = detectFormat(note.fileName);
  const hasFile = !!note.fileUrl && note.fileUrl !== "#";
  const isIdbFile = hasFile && note.fileUrl!.startsWith("idb:");
  const fileServingUrl = (() => {
    if (!hasFile) return null;
    if (isIdbFile) return blobUrl;
    if (note.fileUrl!.startsWith("/objects/")) return `/api/storage${note.fileUrl}`;
    return null;
  })();
  const isPdf = fileFormat === "PDF";
  const isImage = fileFormat === "Image";
  const isVideo = fileFormat === "Video";

  return (
    <>
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={16} className="mr-2 rtl:ml-2 rtl:mr-0 flip-rtl" />{" "}
        {t("noteDetail.backToNotes")}
      </Link>

      <div className="bg-background rounded-2xl border border-border/60 shadow-sm overflow-hidden mb-8">
        {/* ── Header ── */}
        <div className="p-8 border-b border-border/60 bg-muted/10">
          <div className="flex items-center gap-3 mb-6">
            <Badge variant="secondary" className="font-bold tracking-wider px-3 py-1">
              {toSingularLabel(note.fileType)}
            </Badge>
            {fileFormat !== "FILE" && hasFile && (
              <Badge
                variant="outline"
                className={`font-semibold uppercase text-xs border ${FileTypeBadgeColor(fileFormat)}`}
              >
                {fileFormat}
              </Badge>
            )}
            {note.year && (
              <Badge variant="outline" className="font-semibold text-muted-foreground">
                {t("noteDetail.year", { year: note.year })}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground flex items-center ml-auto rtl:mr-auto rtl:ml-0">
              <Calendar size={14} className="mr-1 rtl:ml-1 rtl:mr-0" />
              {format(new Date(note.createdAt), "MMM d, yyyy")}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            {note.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
            {note.authorName && (
              <span className="flex items-center gap-2.5 text-foreground">
                <RankFrame
                  name={note.authorName}
                  rank={authorRank}
                  size={48}
                />
                <span className="flex flex-col gap-0.5" dir="rtl">
                  <span className="font-bold text-sm leading-tight" style={{ color: "hsl(130 42% 18%)" }}>
                    {note.authorName}
                  </span>
                  <RankBadgePill rank={authorRank} size="xs" />
                </span>
              </span>
            )}
            <div className="flex gap-2 ml-auto rtl:mr-auto rtl:ml-0">
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={openEdit}>
                <Pencil size={14} /> تعديل
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={14} /> حذف
              </Button>
            </div>
          </div>
        </div>

        {/* ── Metadata grid ── */}
        <div className="p-8 border-b border-border/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Left: Description + Tags */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText size={20} className="text-primary" /> {t("noteDetail.description")}
                </h3>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-6 rounded-xl border border-border/40">
                  {note.description || t("noteDetail.noDescription")}
                </div>
              </div>

              {note.tags && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t("noteDetail.tags")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {note.tags.split(",").map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-secondary/10 text-secondary hover:bg-secondary/20 text-sm py-1 px-3"
                      >
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Context + actions */}
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                  {t("noteDetail.context")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="text-primary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {t("noteDetail.university")}
                      </div>
                      <div className="font-medium text-sm">{note.universityName}</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Layers className="text-secondary mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {t("noteDetail.module")}
                      </div>
                      <div className="font-medium text-sm">{note.moduleName}</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <BookOpen className="text-accent-foreground mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {t("noteDetail.subject")}
                      </div>
                      <div className="font-medium text-sm">{note.subjectName}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); void handleDownload(); }}
                  disabled={!hasFile || downloading}
                  className={`inline-flex items-center justify-center gap-2 w-full rounded-md text-sm font-bold h-11 px-4 shadow-sm transition-colors ${
                    hasFile
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {downloading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Download size={18} />}
                  {downloading
                    ? "جاري التحميل..."
                    : t("noteDetail.download", { count: note.downloads })}
                </button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2 border-green-200 hover:bg-green-50 hover:text-green-700 text-green-700 bg-green-50/50"
                    ref={upvoteBtnRef}
                    onClick={handleUpvote}
                    disabled={upvoteMutation.isPending}
                  >
                    <ThumbsUp size={18} />{" "}
                    {t("noteDetail.upvote", { count: note.upvotes })}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-4"
                    onClick={handleNoteShare}
                  >
                    <Share2 size={18} />
                  </Button>
                </div>

                {/* ── Rating widget ── */}
                <NoteRatingWidget noteId={note.id} />

              </div>
            </div>
          </div>
        </div>

        {/* ── File Viewer — full width ── */}
        <div className="p-8">
          <h3
            className="text-xl font-bold mb-5 flex items-center gap-2"
            dir="rtl"
          >
            <Paperclip size={22} className="text-primary" />
            الملف المرفق
          </h3>

          {hasFile && fileServingUrl ? (
            <>
              {isPdf && (
                <ScribdPdfViewer
                  src={fileServingUrl}
                  fileName={note.fileName}
                  fileSize={note.fileSize ?? null}
                  noteId={id}
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              )}

              {isImage && (
                <ImageViewer
                  src={fileServingUrl}
                  fileName={note.fileName}
                  fileSize={note.fileSize ?? null}
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              )}

              {isVideo && (
                <VideoViewer
                  src={fileServingUrl}
                  fileName={note.fileName}
                  fileSize={note.fileSize ?? null}
                  noteId={id}
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              )}

              {!isPdf && !isImage && !isVideo && (
                <DocumentCard
                  src={fileServingUrl}
                  fileName={note.fileName}
                  fileSize={note.fileSize ?? null}
                  format={fileFormat}
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              )}
            </>
          ) : hasFile && fileNotFound ? (
            <div
              className="bg-amber-50/60 p-6 rounded-2xl border border-amber-200/60 text-sm flex flex-col items-center gap-2"
              dir="rtl"
            >
              <Paperclip size={28} className="text-amber-400/70 mb-1" />
              <span className="text-amber-800 font-medium">
                تعذر العثور على الملف المرفق. قد يكون تم حذفه من التخزين المحلي.
              </span>
            </div>
          ) : hasFile && isIdbFile && !fileNotFound ? (
            <div
              className="flex items-center justify-center gap-2 py-8 text-muted-foreground"
              dir="rtl"
            >
              <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span>جاري تحميل الملف...</span>
            </div>
          ) : (
            <div
              className="text-muted-foreground bg-muted/20 p-6 rounded-2xl border border-dashed border-border text-sm flex flex-col items-center gap-2"
              dir="rtl"
            >
              <Paperclip size={28} className="text-muted-foreground/40 mb-1" />
              <span>لم يتم إرفاق ملف بهذه الملاحظة</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل الملاحظة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">العنوان</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="عنوان الملاحظة"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">الوصف</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="وصف الملاحظة"
                className="resize-none h-28"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">الوسوم (مفصولة بفاصلة)</label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="علم وظائف الأعضاء، قلب، ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateNote.isPending || !editTitle.trim()}
            >
              {updateNote.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الملاحظة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه الملاحظة نهائيًا ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
              disabled={deleteNote.isPending}
            >
              {deleteNote.isPending ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    {XpPortal}
    </>
  );
}
