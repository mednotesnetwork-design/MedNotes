import { useLocation } from "wouter";
import { Construction } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

// Map routes → Arabic section names
const SECTION_LABELS: Record<string, string> = {
  "/discover":     "اكتشف",
  "/groups":       "المجموعات",
  "/contributors": "المساهمون",
  "/favorites":    "المفضلة",
};

export function ComingSoon() {
  const [location] = useLocation();
  const label = SECTION_LABELS[location] ?? "هذا القسم";

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12"
    >
      {/* Outer glow card */}
      <div
        className="w-full max-w-sm flex flex-col items-center text-center gap-5 p-8"
        style={{
          background:           "rgba(255,255,255,0.68)",
          backdropFilter:       "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border:               "1px solid rgba(255,255,255,0.88)",
          boxShadow:            "0 16px 48px rgba(252,163,173,0.14), 0 4px 16px rgba(0,0,0,0.06)",
          borderRadius:         "1.75rem",
        }}
      >
        {/* Decorative icon bubble */}
        <div
          className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #FCA3AD, #FA7370)",
            boxShadow:  "0 8px 28px rgba(250,115,112,0.32)",
          }}
        >
          <Construction size={34} color="white" strokeWidth={1.6} />
        </div>

        {/* Section title */}
        <div>
          <p
            className="text-xs font-extrabold uppercase tracking-widest mb-1"
            style={{ color: "hsl(338 52% 66%)" }}
          >
            قيد التجهيز
          </p>
          <h1
            className="font-serif font-extrabold text-2xl leading-snug"
            style={{ color: "hsl(130 45% 16%)" }}
            dir="rtl"
          >
            {label}
          </h1>
        </div>

        {/* Body message */}
        <p
          className="text-sm font-medium leading-relaxed"
          style={{ color: "hsl(130 14% 44%)" }}
          dir="rtl"
        >
          هذا القسم قيد التجهيز وسيتم ربطه بالمحتوى قريبًا.
        </p>

        {/* MedNotes brand footer */}
        <div className="flex items-center gap-2 pt-1">
          <AppLogo size={22} />
          <span
            className="font-serif font-bold text-sm"
            style={{ color: "hsl(130 38% 32%)" }}
          >
            MedNotes
          </span>
        </div>
      </div>
    </div>
  );
}
