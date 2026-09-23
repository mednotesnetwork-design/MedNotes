import { Link } from "wouter";
import { AppLogo } from "@/components/AppLogo";
import { useTranslation } from "react-i18next";

const NAV_LINKS = [
  { href: "/universities", key: "nav.universities" },
  { href: "/modules",      key: "nav.modules" },
  { href: "/notes",        key: "nav.browse" },
  { href: "/upload",       key: "nav.upload" },
];

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer
      className="border-t mt-8"
      style={{
        borderColor: "rgba(255,255,255,0.60)",
        background: "rgba(255,255,255,0.45)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="container mx-auto px-4 max-w-7xl py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <AppLogo size={30} />
              <div>
                <span
                  className="font-serif font-bold text-base block"
                  style={{ color: "hsl(130 45% 16%)" }}
                >
                  {t("nav.brand")}
                </span>
                <span
                  className="text-[10px] font-medium block"
                  style={{ color: "hsl(130 30% 44%)" }}
                  dir="rtl"
                >
                  تعلّم، شارك، واترك أثرًا 🌿
                </span>
              </div>
            </Link>
            <p
              className="text-sm leading-relaxed max-w-xs"
              style={{ color: "hsl(130 12% 48%)" }}
            >
              {t("footer.tagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-4"
              style={{ color: "hsl(130 20% 44%)" }}
            >
              {t("footer.links")}
            </h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-primary"
                    style={{ color: "hsl(130 12% 48%)" }}
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: "hsl(130 20% 44%)" }}
            >
              {t("footer.contribute")}
            </h4>
            <p
              className="text-sm mb-4 leading-relaxed"
              style={{ color: "hsl(130 12% 48%)" }}
            >
              {t("footer.contributeDesc")}
            </p>
            <Link href="/upload">
              <button
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,hsl(130 38% 50%),hsl(130 32% 40%))" }}
              >
                {t("footer.uploadCta")}
              </button>
            </Link>
          </div>

        </div>

        <div
          className="mt-8 pt-6 border-t text-center text-sm"
          style={{ borderColor: "rgba(255,255,255,0.55)", color: "hsl(130 12% 52%)" }}
        >
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
