import { useState } from "react";
import { Link } from "wouter";
import { Search, Clock, TrendingUp, LayoutList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListNotes } from "@workspace/api-client-react";
import { NoteCard } from "@/components/NoteCard";

/* ── constants ──────────────────────────────────────────────── */

const CATEGORIES = [
  { value: "all",    label: "الكل" },
  { value: "ملخصات", label: "ملخصات" },
  { value: "تفريغات", label: "تفريغات" },
  { value: "شروحات", label: "شروحات" },
  { value: "أسئلة",  label: "أسئلة" },
] as const;

/* placeholder heights for skeleton shimmer */
const SK_H = [158, 202, 178, 238, 167, 220, 193, 248, 174, 212];

/* ── skeleton grid ──────────────────────────────────────────── */

function MasonrySkeleton() {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4" style={{ columnGap: 14 }}>
      {SK_H.map((h, i) => (
        <div key={i} className="break-inside-avoid mb-3.5">
          <Skeleton className="rounded-[1.1rem]" style={{ height: h + 72 }} />
        </div>
      ))}
    </div>
  );
}

/* ── main export ────────────────────────────────────────────── */

export function NotesListing() {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy]     = useState<"recent" | "upvotes">("recent");

  const queryParams: Record<string, unknown> = {};
  if (search) queryParams.search = search;
  if (category !== "all") queryParams.fileType = category;

  const { data: notes, isLoading } = useListNotes(
    queryParams as Parameters<typeof useListNotes>[0],
  );

  const sorted = notes
    ? [...notes].sort((a, b) =>
        sortBy === "upvotes"
          ? b.upvotes - a.upvotes
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">

      {/* Header */}
      <div className="mb-7 text-center space-y-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight">استعرض الملاحظات</h1>
        <p className="text-muted-foreground text-sm">
          ملاحظات من طلاب الطب في كل مكان — شارك وتعلّم
        </p>
      </div>

      {/* Search */}
      <div className="mb-5 max-w-md mx-auto">
        <div className="relative">
          <Search
            size={17}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن ملاحظة..."
            dir="rtl"
            className="h-11 pr-11 rounded-full bg-white border-border/50 focus-visible:ring-primary/30"
          />
        </div>
      </div>

      {/* Category tabs + sort */}
      <div className="flex flex-wrap items-center gap-2 mb-6" dir="rtl">

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                category === cat.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-white border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-white border border-border/50 rounded-full p-1 mr-auto rtl:mr-0 rtl:ml-auto">
          <button
            onClick={() => setSortBy("recent")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              sortBy === "recent"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock size={12} /> الأحدث
          </button>
          <button
            onClick={() => setSortBy("upvotes")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              sortBy === "upvotes"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp size={12} /> الأعلى
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground mb-5 font-medium" dir="rtl">
        {isLoading ? "جاري التحميل..." : `${sorted.length} ملاحظة`}
      </p>

      {/* Masonry grid */}
      {isLoading ? (
        <MasonrySkeleton />
      ) : sorted.length > 0 ? (
        <div className="columns-2 md:columns-3 lg:columns-4" style={{ columnGap: 14 }}>
          {sorted.map((note, i) => (
            <div key={note.id} className="break-inside-avoid mb-3.5">
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
        <div className="py-28 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center">
            <LayoutList size={28} className="text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold">لا توجد ملاحظات</h3>
          <p className="text-sm text-muted-foreground">
            {category !== "all"
              ? "لا توجد ملاحظات في هذه الفئة بعد"
              : "جرّب كلمة بحث مختلفة"}
          </p>
          <Link href="/upload">
            <Button size="lg" className="rounded-full px-8 mt-2">
              ارفع أول ملاحظة
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
