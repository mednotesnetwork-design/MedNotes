import { useState, useCallback, useRef } from "react";

interface XpEntry { id: number; label: string; x: number; y: number }

const XP_COLORS: Record<string, string> = {
  "+2":  "#10B981",   // upvote
  "+3":  "#3B82F6",   // save
  "+5":  "#8B5CF6",   // download
  "+20": "#F59E0B",   // note upload
  "+30": "#F97316",   // 50-downloads bonus
  "+50": "#EC4899",   // 100-upvotes bonus
};

/* Floating "+N XP" DOM element (portal-free, relative to parent) */
function XpFloater({ entry }: { entry: XpEntry }) {
  const color = XP_COLORS[entry.label] ?? "#6B7280";
  return (
    <div
      key={entry.id}
      className="mdn-xp-float"
      style={{
        position:     "fixed",
        left:         entry.x,
        top:          entry.y,
        pointerEvents:"none",
        zIndex:       9999,
        fontWeight:   800,
        fontSize:     13,
        color,
        textShadow:   `0 0 10px ${color}99, 0 1px 0 rgba(0,0,0,0.18)`,
        whiteSpace:   "nowrap",
        userSelect:   "none",
        fontFamily:   "'Cairo', sans-serif",
      }}
      dir="rtl"
    >
      {entry.label} XP ✨
    </div>
  );
}

/* Hook: returns a trigger fn + the portal element to render */
export function useXpGain() {
  const [entries, setEntries] = useState<XpEntry[]>([]);
  const nextId = useRef(0);

  const triggerXp = useCallback(
    (pts: number, anchorEl?: HTMLElement | null) => {
      const id = nextId.current++;
      let x = window.innerWidth  / 2 - 30;
      let y = window.innerHeight / 2 - 20;

      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        x = rect.left + rect.width  / 2 - 30;
        y = rect.top  + rect.height / 2 - 10;
      }

      const label = pts > 0 ? `+${pts}` : `${pts}`;
      setEntries((prev) => [...prev, { id, label, x, y }]);

      // remove after animation (~1.6 s)
      setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }, 1700);
    },
    [],
  );

  const XpPortal = (
    <>
      {entries.map((e) => (
        <XpFloater key={e.id} entry={e} />
      ))}
    </>
  );

  return { triggerXp, XpPortal };
}
