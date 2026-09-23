import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";
import { AppLogo } from "@/components/AppLogo";

interface HeroProps {
  onSearch: (query: string) => void;
  activeFilter: string;
  onFilter: (f: string) => void;
  stats?: { totalNotes: number; totalUniversities: number; totalModules: number } | null;
  statsLoading?: boolean;
}

const CHIPS = [
  { key: "all",   labelKey: "home.filter.all" },
  { key: "pdf",   labelKey: "home.filter.pdf" },
  { key: "doc",   labelKey: "home.filter.doc" },
  { key: "year1", labelKey: "home.filter.year1" },
  { key: "year2", labelKey: "home.filter.year2" },
  { key: "year3", labelKey: "home.filter.year3" },
];

export function Hero({ onSearch, activeFilter, onFilter, stats, statsLoading }: HeroProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (new FormData(e.currentTarget).get("q") as string)?.trim() ?? "";
    if (q) onSearch(q);
  };

  return (
    <section className="w-full pt-10 pb-8 md:pt-14 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center text-center">

        {/* Logo */}
        <AppLogo size={62} />

        {/* Title */}
        <h1
          className="font-serif font-bold text-4xl md:text-5xl mt-4 mb-1.5 leading-tight"
          style={{ color: "hsl(130 45% 16%)" }}
        >
          {t("nav.brand")}
        </h1>

        {/* Arabic slogan */}
        <p
          className="text-base font-semibold mb-1"
          style={{ color: "hsl(130 28% 42%)" }}
          dir="rtl"
        >
          تعلّم، شارك، واترك أثرًا 🌿
        </p>

        {/* English subline */}
        {!isRTL && (
          <p className="text-sm mb-6" style={{ color: "hsl(130 12% 50%)" }}>
            {t("home.hero.subline")}
          </p>
        )}
        {isRTL && <div className="mb-6" />}

        {/* Stats pills */}
        {statsLoading ? (
          <div className="flex gap-2 mb-6">
            {[56,64,48].map(w => <Skeleton key={w} className="h-7 rounded-full" style={{ width: w }} />)}
          </div>
        ) : stats ? (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {[
              { v: stats.totalNotes,        l: t("home.hero.statNotes") },
              { v: stats.totalUniversities, l: t("home.hero.statUniversities") },
              { v: stats.totalModules,      l: t("home.hero.statModules") },
            ].map(s => (
              <div
                key={s.l}
                className="glass px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                style={{ color: "hsl(130 35% 30%)" }}
              >
                <span className="font-extrabold text-sm">{s.v}</span>
                <span style={{ color: "hsl(130 12% 50%)" }}>{s.l}</span>
              </div>
            ))}
          </div>
        ) : <div className="mb-6" />}

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="w-full max-w-xl mb-5">
          <div
            className="glass-strong flex items-center rounded-2xl px-4 py-1.5 gap-2"
          >
            <Search size={17} className="text-muted-foreground shrink-0" />
            <Input
              name="q"
              placeholder={t("home.hero.searchPlaceholder")}
              className="flex-1 h-10 border-0 shadow-none bg-transparent text-foreground focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
            />
            <Button
              type="submit"
              className="h-8 px-5 rounded-xl text-sm font-semibold text-white shrink-0 border-0"
              style={{ background: "linear-gradient(135deg,hsl(130 38% 50%),hsl(130 32% 40%))" }}
            >
              {t("home.hero.searchBtn")}
            </Button>
          </div>
        </form>

        {/* Filter chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {CHIPS.map(chip => (
            <button
              key={chip.key}
              onClick={() => onFilter(chip.key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={
                activeFilter === chip.key
                  ? {
                      background: "linear-gradient(135deg,hsl(130 38% 50%),hsl(130 32% 40%))",
                      color: "white",
                      boxShadow: "0 2px 8px rgba(78,138,89,0.28)",
                    }
                  : {
                      background: "rgba(255,255,255,0.58)",
                      border: "1px solid rgba(255,255,255,0.80)",
                      color: "hsl(130 20% 44%)",
                    }
              }
            >
              {t(chip.labelKey)}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
