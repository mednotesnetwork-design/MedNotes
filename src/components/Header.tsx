import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu, X, Globe, Upload,
  Home, Compass, BookOpen, GraduationCap, FileText,
  Mic, PlayCircle, HelpCircle, Users, Trophy, Bookmark,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { AppLogo } from "@/components/AppLogo";
import { RankFrame, RankBadgePill } from "@/components/RankFrame";

const NAV_LINKS = [
  { href: "/universities", key: "nav.universities" },
  { href: "/modules",      key: "nav.modules" },
  { href: "/notes",        key: "nav.browse" },
];

// ── Mobile sidebar nav structure ─────────────────────────────
const MOBILE_MAIN = [
  { href: "/",            icon: Home,          label: "الرئيسية",   color: "hsl(130 38% 44%)" },
  { href: "/discover",    icon: Compass,        label: "اكتشف",      color: "hsl(200 55% 48%)" },
];

const MOBILE_CONTENT = [
  { href: "/modules",                      icon: BookOpen,      label: "المواد",         color: "hsl(25 72% 50%)"  },
  { href: "/universities",                 icon: GraduationCap, label: "الجامعات",       color: "hsl(130 38% 44%)" },
  { href: "/notes?type=summary",           icon: FileText,      label: "الملخصات",       color: "hsl(40 82% 52%)"  },
  { href: "/notes?type=transcription",     icon: Mic,           label: "تفريغات",        color: "hsl(280 45% 54%)" },
  { href: "/notes?type=explanation",       icon: PlayCircle,    label: "شروحات",         color: "hsl(160 48% 44%)" },
  { href: "/notes?type=questions",         icon: HelpCircle,    label: "بنك الأسئلة",    color: "hsl(10 65% 52%)"  },
];

const MOBILE_COMMUNITY = [
  { href: "/groups",       icon: Users,    label: "المجموعات",   color: "hsl(200 55% 48%)" },
  { href: "/contributors", icon: Trophy,   label: "المساهمون",   color: "hsl(40 82% 52%)"  },
  { href: "/favorites",    icon: Bookmark, label: "المفضلة",     color: "hsl(338 55% 56%)" },
];

// ── Mobile nav item ───────────────────────────────────────────
function MobileNavItem({
  href, icon: Icon, label, iconColor, active, onClick,
}: {
  href: string; icon: React.ElementType; label: string;
  iconColor: string; active: boolean; onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <div
        className="flex items-center gap-3 px-3.5 py-2.5 transition-all"
        style={active ? {
          background: "linear-gradient(135deg, #FCA3AD, #FA7370)",
          borderRadius: "9999px",
          boxShadow: "0 4px 18px rgba(250,115,112,0.30)",
          border: "1px solid transparent",
        } : {
          borderRadius: "9999px",
          border: "1px solid transparent",
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={active ? {
            background: "rgba(255,255,255,0.25)",
            border: "1px solid rgba(255,255,255,0.35)",
          } : {
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.70)",
          }}
        >
          <Icon
            size={15}
            style={{ color: active ? "white" : "hsl(130 14% 54%)" }}
          />
        </div>
        <span
          className="text-sm font-bold"
          style={{ color: active ? "white" : "hsl(130 16% 38%)" }}
          dir="rtl"
        >
          {label}
        </span>
        {active && (
          <div
            className="ml-auto w-1.5 h-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.70)" }}
          />
        )}
      </div>
    </Link>
  );
}

// ── Section label ─────────────────────────────────────────────
function MobileSectionLabel({ label, gradient }: { label: string; gradient: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mt-3 mb-1">
      <div className="h-px flex-1" style={{ background: gradient }} />
      <span
        className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full"
        style={{ background: gradient + "22", color: "hsl(130 18% 48%)" }}
        dir="rtl"
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: gradient }} />
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const [location] = useLocation();

  const isActive = (href: string) => location === href || location.startsWith(href + "?");
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full glass-strong border-b border-white/60">
      <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between py-3">

        {/* Logo + brand */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <AppLogo size={32} />
          <div className="leading-tight">
            <span className="font-serif font-bold text-lg block" style={{ color: "hsl(130 45% 16%)" }}>
              {t("nav.brand")}
            </span>
            <span className="text-[10px] font-medium block" style={{ color: "hsl(130 30% 42%)" }} dir="rtl">
              تعلّم، شارك، واترك أثرًا 🌿
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive(link.href) ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
              style={isActive(link.href) ? { background: "rgba(78,138,89,0.10)" } : undefined}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={toggleLanguage}
            className="h-8 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all hover:bg-primary/8"
            style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.80)", color: "hsl(130 25% 40%)" }}
          >
            <Globe size={13} />
            {t("common.language")}
          </button>
          <Link href="/upload">
            <button
              className="h-8 px-5 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
              style={{ background: "linear-gradient(135deg,hsl(130 38% 50%),hsl(130 32% 40%))" }}
            >
              {t("nav.upload")}
            </button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden p-2 rounded-full transition-colors hover:bg-primary/8"
              style={{ color: "hsl(130 25% 40%)" }}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </SheetTrigger>

          {/* ═══════════════════════════════════════════════════
              MOBILE SIDEBAR SHEET
          ═══════════════════════════════════════════════════ */}
          <SheetContent
            side="right"
            className="w-[300px] p-0 border-none"
            style={{
              background: "linear-gradient(160deg, hsla(50,62%,96%,0.98) 0%, hsla(130,28%,96%,0.98) 50%, hsla(25,60%,96%,0.98) 100%)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
            }}
          >
            {/* Decorative blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-25"
                style={{ background: "radial-gradient(circle, hsl(130 52% 72%), transparent 70%)" }} />
              <div className="absolute top-1/3 -left-8 w-32 h-32 rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, hsl(25 82% 76%), transparent 70%)" }} />
              <div className="absolute bottom-32 -right-8 w-28 h-28 rounded-full opacity-18"
                style={{ background: "radial-gradient(circle, hsl(348 62% 76%), transparent 70%)" }} />
            </div>

            <div className="relative flex flex-col h-full overflow-y-auto">

              {/* ── Header ───────────────────────────────────── */}
              <div
                className="flex items-center gap-3 px-5 py-4 shrink-0"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  borderBottom: "1px solid rgba(255,255,255,0.70)",
                }}
              >
                <AppLogo size={34} />
                <div>
                  <SheetTitle
                    className="font-serif font-bold text-base leading-tight"
                    style={{ color: "hsl(130 45% 16%)" }}
                  >
                    MedNotes
                  </SheetTitle>
                  <p className="text-[10px] font-medium" style={{ color: "hsl(130 30% 44%)" }} dir="rtl">
                    تعلّم، شارك، واترك أثرًا 🌿
                  </p>
                </div>
                <button
                  onClick={close}
                  className="ml-auto p-1.5 rounded-full transition-colors"
                  style={{ background: "rgba(255,255,255,0.60)", color: "hsl(130 18% 50%)" }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* ── Navigation ───────────────────────────────── */}
              <div className="flex flex-col px-3 pt-3 pb-2 gap-0.5">
                {MOBILE_MAIN.map(item => (
                  <MobileNavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    iconColor={item.color}
                    active={item.href === "/" ? location === "/" : isActive(item.href)}
                    onClick={close}
                  />
                ))}

                <MobileSectionLabel
                  label="المحتوى"
                  gradient="linear-gradient(90deg, hsla(130,42%,72%,0.55), transparent)"
                />
                {MOBILE_CONTENT.map(item => (
                  <MobileNavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    iconColor={item.color}
                    active={isActive(item.href)}
                    onClick={close}
                  />
                ))}

                <MobileSectionLabel
                  label="المجتمع"
                  gradient="linear-gradient(90deg, hsla(25,78%,72%,0.55), transparent)"
                />
                {MOBILE_COMMUNITY.map(item => (
                  <MobileNavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    iconColor={item.color}
                    active={isActive(item.href)}
                    onClick={close}
                  />
                ))}
              </div>

              {/* ── Language toggle ───────────────────────────── */}
              <div className="px-4 mt-1 mb-2">
                <button
                  onClick={() => { toggleLanguage(); close(); }}
                  className="w-full h-9 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(255,255,255,0.75)",
                    color: "hsl(130 25% 44%)",
                  }}
                >
                  <Globe size={13} />
                  {t("common.language")}
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* ── Bottom section ────────────────────────────── */}
              <div
                className="px-4 pt-4 pb-6 flex flex-col gap-3 shrink-0"
                style={{
                  background: "rgba(255,255,255,0.45)",
                  borderTop: "1px solid rgba(255,255,255,0.72)",
                }}
              >
                {/* Upload button */}
                <Link href="/upload" onClick={close}>
                  <button
                    className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, hsl(130 48% 52%), hsl(130 38% 40%))",
                      boxShadow: "0 6px 20px rgba(78,138,89,0.32)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    <Upload size={15} />
                    <span dir="rtl">رفع محتوى</span>
                  </button>
                </Link>

                {/* Contributor profile card */}
                <div
                  className="rounded-2xl p-3.5"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.50))",
                    border: "1px solid rgba(255,255,255,0.85)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Avatar row */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <RankFrame name="ط" rank="silver" size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "hsl(130 42% 18%)" }} dir="rtl">
                        طالب طب
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <RankBadgePill rank="silver" size="xs" />
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold" style={{ color: "hsl(130 18% 52%)" }} dir="rtl">
                        التقدم للمستوى التالي
                      </span>
                      <span className="text-[10px] font-extrabold" style={{ color: "hsl(130 38% 40%)" }}>
                        35%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(78,138,89,0.12)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: "35%",
                          background: "linear-gradient(90deg, hsl(130 48% 55%), hsl(160 45% 52%))",
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[
                      { val: "٤٢",  label: "المتابعون" },
                      { val: "١٢٨", label: "التحميلات" },
                      { val: "٧",   label: "المساهمات" },
                    ].map(stat => (
                      <div
                        key={stat.label}
                        className="py-2 rounded-xl"
                        style={{ background: "rgba(78,138,89,0.07)" }}
                      >
                        <p
                          className="text-sm font-extrabold leading-tight"
                          style={{ color: "hsl(130 42% 22%)" }}
                          dir="rtl"
                        >
                          {stat.val}
                        </p>
                        <p
                          className="text-[9px] font-semibold leading-tight"
                          style={{ color: "hsl(130 14% 52%)" }}
                          dir="rtl"
                        >
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </SheetContent>
        </Sheet>

      </div>
    </header>
  );
}
