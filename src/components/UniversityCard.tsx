import { Link } from "wouter";
import { MapPin, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";

interface University {
  id: number;
  name: string;
  nameAr?: string | null;
  city?: string | null;
  country: string;
  logoUrl?: string | null;
  description?: string | null;
  featured: boolean;
  noteCount: number;
}

// ── Featured banner card ──────────────────────────────────────
export function FeaturedUniversityCard({ university }: { university: University }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const primary = isRTL && university.nameAr ? university.nameAr : university.name;
  const secondary = isRTL ? university.name : university.nameAr;

  return (
    <Link href={`/notes?universityId=${university.id}`}>
      <div
        className="group block glass card-hover overflow-hidden cursor-pointer"
        style={{ borderRadius: "1.25rem" }}
      >
        <div
          className="h-[3px]"
          style={{ background: "linear-gradient(90deg,#86C98D,#4A9A55,#93C5FD)" }}
        />
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-md shrink-0 group-hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg,#86C98D,#4A9A55)" }}
          >
            {university.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
              style={{ background: "rgba(78,138,89,0.12)", color: "hsl(130 35% 38%)" }}
            >
              {t("universities.featuredBadge")}
            </span>
            <h3 className="font-bold text-base leading-tight truncate" style={{ color: "hsl(130 42% 16%)" }}>
              {primary}
            </h3>
            {secondary && (
              <p className="text-xs truncate mt-0.5" style={{ color: "hsl(130 12% 50%)" }}
                dir={isRTL ? "ltr" : "rtl"}>{secondary}</p>
            )}
            <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: "hsl(130 12% 52%)" }}>
              <MapPin size={11} className="text-primary/60 shrink-0" />
              {university.city ? `${university.city}, ` : ""}{university.country}
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <FileText size={14} />{university.noteCount}
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: "hsl(130 12% 52%)" }}>
              {t("universities.notesAvailable", { count: "" }).trim()}
            </p>
          </div>
        </div>

        {university.description && (
          <div
            className="px-5 pb-4 text-xs leading-relaxed line-clamp-2 border-t"
            style={{ color: "hsl(130 12% 50%)", borderColor: "rgba(255,255,255,0.60)", paddingTop: "0.75rem" }}
          >
            {university.description}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Regular grid card ─────────────────────────────────────────
export function UniversityCard({ university }: { university: University }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const primary = isRTL && university.nameAr ? university.nameAr : university.name;
  const secondary = isRTL ? university.name : university.nameAr;

  return (
    <Link href={`/notes?universityId=${university.id}`}>
      <div
        className="group flex flex-col glass card-hover overflow-hidden h-full cursor-pointer"
        style={{ borderRadius: "1.25rem" }}
      >
        <div
          className="h-[2px] group-hover:h-[3px] transition-all"
          style={{ background: "linear-gradient(90deg,rgba(134,201,141,0.6),rgba(74,154,85,0.6))" }}
        />
        <div className="p-4 flex flex-col items-center text-center flex-1">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-black mb-3 group-hover:scale-110 transition-transform shadow-sm"
            style={{ background: "linear-gradient(135deg,#A8DDB2,#4A9A55)" }}
          >
            {university.name.charAt(0)}
          </div>
          <h3 className="font-semibold text-xs leading-snug line-clamp-2 mb-0.5" style={{ color: "hsl(130 40% 18%)" }}>
            {primary}
          </h3>
          {secondary && (
            <p className="text-[10px] mb-2 line-clamp-1" style={{ color: "hsl(130 12% 52%)" }}
              dir={isRTL ? "ltr" : "rtl"}>{secondary}</p>
          )}
          <div className="flex items-center gap-1 text-[10px] mb-auto" style={{ color: "hsl(130 12% 52%)" }}>
            <MapPin size={10} className="text-primary/50 shrink-0" />
            {university.city ?? university.country}
          </div>
          <div className="mt-3 pt-3 w-full border-t" style={{ borderColor: "rgba(255,255,255,0.55)" }}>
            <span className="text-[10px] font-semibold" style={{ color: "hsl(130 20% 48%)" }}>
              {t("universities.notesAvailable", { count: university.noteCount })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
