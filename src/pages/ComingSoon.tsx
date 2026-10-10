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
          background: "var(--mn-surface)",
          backdropFilter:       "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border:               "1px solid var(--mn-border)",
          boxShadow: "none",
          borderRadius:         "1.75rem",
        }}
      >
        {/* Decorative icon bubble */}
        <div
          className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center"
          style={{
            background: "var(--mn-surface-raised)",
            boxShadow: "none",
          }}
        >
          <Construction size={34} color="white" strokeWidth={1.6} />
        </div>

        {/* Section title */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "#d7aeb3" }}
          >
            قيد التجهيز
          </p>
          <h1
            className="font-sans font-semibold text-2xl leading-snug"
            style={{ color: "#e6cfb7" }}
            dir="rtl"
          >
            {label}
          </h1>
        </div>

        {/* Body message */}
        <p
          className="text-sm font-medium leading-relaxed"
          style={{ color: "#a0b8b3" }}
          dir="rtl"
        >
          هذا القسم قيد التجهيز وسيتم ربطه بالمحتوى قريبًا.
        </p>

        {/* MedNotes brand footer */}
        <div className="flex items-center gap-2 pt-1">
          <AppLogo size={22} />
          <span
            className="font-sans font-bold text-sm"
            style={{ color: "#8dd3b3" }}
          >
            MedNotes
          </span>
        </div>
      </div>
    </div>
  );
}
