import { Link, useLocation } from "wouter";
import {
  Home, Compass, BookOpen, GraduationCap, FileText,
  Mic, PlayCircle, HelpCircle, Users, Trophy, Bookmark,
  Upload, Library,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { RankFrame, RankBadgePill } from "@/components/RankFrame";

const MAIN_NAV = [
  { href: "/",            icon: Home,          label: "الرئيسية" },
  { href: "/discover",    icon: Compass,        label: "اكتشف" },
];

const CONTENT_NAV = [
  { href: "/modules",                      icon: BookOpen,      label: "المواد" },
  { href: "/universities",                 icon: GraduationCap, label: "الجامعات" },
  { href: "/notes?type=summary",           icon: FileText,      label: "الملخصات" },
  { href: "/notes?type=transcription",     icon: Mic,           label: "تفريغات" },
  { href: "/notes?type=explanation",       icon: PlayCircle,    label: "شروحات" },
  { href: "/notes?type=questions",         icon: HelpCircle,    label: "بنك الأسئلة" },
];

const COMMUNITY_NAV = [
  { href: "/groups",       icon: Users,    label: "المجموعات" },
  { href: "/contributors", icon: Trophy,   label: "المساهمون" },
  { href: "/collections",  icon: Library,  label: "مجموعاتي" },
  { href: "/favorites",    icon: Bookmark, label: "المفضلة" },
];

const SECTION_COLORS = [
  { from: "#193334", to: "#193334" },
  { from: "#193334",  to: "#193334" },
  { from: "#193334", to: "#193334" },
];

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full w-fit mt-4 mb-1"
      style={{ background: color, color: "#e6cfb7" }}
    >
      {label}
    </p>
  );
}

function NavItem({
  href, icon: Icon, label, exact = false,
}: {
  href: string; icon: React.ElementType; label: string; exact?: boolean;
}) {
  const [location] = useLocation();
  const active = exact ? location === href : location.startsWith(href) && href !== "/";
  const rootActive = href === "/" && location === "/";
  const isActive = active || rootActive;

  return (
    <Link href={href} aria-current={isActive ? "page" : undefined}>
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all group"
        style={
          isActive
            ? {
                background:   "var(--mn-surface-raised)",
                borderRadius: "7px",
                boxShadow: "none",
                border:       "1px solid transparent",
              }
            : {
                borderRadius: "7px",
                border:       "1px solid transparent",
              }
        }
      >
        <Icon
          size={16}
          className="shrink-0 transition-colors"
          style={{ color: isActive ? "white" : "#a0b8b3" }}
        />
        <span
          className="text-sm font-medium transition-colors"
          style={{ color: isActive ? "white" : "#a0b8b3" }}
          dir="rtl"
        >
          {label}
        </span>
      </div>
    </Link>
  );
}

export function LeftSidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-44 lg:w-60 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
      style={{
        background: "var(--mn-surface)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--mn-border)",
        boxShadow: "none",
        borderRadius: "7px",
        padding: "1rem 0.75rem",
        gap: "0",
      }}
    >
      {/* Brand at top */}
      <Link href="/" className="flex items-center gap-2 px-2 mb-4">
        <AppLogo size={28} />
        <div>
          <span
            className="font-sans font-bold text-sm block"
            style={{ color: "#e6cfb7" }}
          >
            MedNotes
          </span>
          <span
            className="text-[9px] font-medium block leading-tight"
            style={{ color: "#8dd3b3" }}
            dir="rtl"
          >
            تعلّم، شارك، واترك أثرًا 🌿
          </span>
        </div>
      </Link>

      {/* Thin divider */}
      <div className="mx-2 mb-3 h-px" style={{ background: "var(--mn-surface)" }} />

      {/* Main nav */}
      <div className="flex flex-col gap-0.5">
        {MAIN_NAV.map(item => (
          <NavItem key={item.href} {...item} exact={item.href === "/"} />
        ))}
      </div>

      {/* Content section */}
      <SectionLabel label="المحتوى" color={SECTION_COLORS[0].from} />
      <div className="flex flex-col gap-0.5">
        {CONTENT_NAV.map(item => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Community section */}
      <SectionLabel label="المجتمع" color={SECTION_COLORS[1].from} />
      <div className="flex flex-col gap-0.5">
        {COMMUNITY_NAV.map(item => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-h-4" />

      {/* Upload button */}
      <div className="px-1 mt-3">
        <Link href="/upload">
          <button
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:shadow-md"
            style={{
              background: "var(--mn-surface-raised)",
              boxShadow: "none",
            }}
          >
            <Upload size={14} />
            <span dir="rtl">رفع ملاحظة</span>
          </button>
        </Link>
      </div>

      {/* Profile mini card */}
      <div
        className="mt-3 px-3 py-3 rounded-xl flex items-center gap-2.5"
        style={{
          background: "var(--mn-surface-raised)",
          border: "1px solid var(--mn-border)",
        }}
      >
        <RankFrame name="ط" rank="silver" size={44} />
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-bold truncate leading-tight"
            style={{ color: "#e6cfb7" }}
            dir="rtl"
          >
            طالب طب
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <RankBadgePill rank="silver" size="xs" />
          </div>
        </div>
      </div>

    </aside>
  );
}
