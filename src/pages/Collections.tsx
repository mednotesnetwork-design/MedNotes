import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Library, Plus, Trash2, BookOpen, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCollections, createCollection, saveCollections,
  type Collection,
} from "@/lib/gamification";
import { LeftSidebar } from "@/components/LeftSidebar";

/* ── Preset collection names ─────────────────────────────────── */
const PRESETS = ["فاينلز", "روبنز", "مراجعة سريعة", "مفضلة"];

export function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setCollections(getCollections());
  }, []);

  const handleCreate = (name: string) => {
    if (!name.trim()) return;
    createCollection(name.trim());
    setCollections(getCollections());
    setNewName("");
    setCreating(false);
  };

  const handleDelete = (id: string) => {
    const updated = collections.filter((c) => c.id !== id);
    saveCollections(updated);
    setCollections(updated);
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="flex gap-4 items-start pb-10">
        <LeftSidebar />

        <main className="flex-1 min-w-0 pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6" dir="rtl">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #86C98D, #4A9A55)" }}
              >
                <Library size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold" style={{ color: "hsl(130 42% 14%)" }}>
                  مجموعاتي
                </h1>
                <p className="text-xs" style={{ color: "hsl(130 18% 52%)" }}>
                  {collections.length} مجموعة
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="rounded-full gap-2"
              onClick={() => setCreating(true)}
            >
              <Plus size={14} /> إنشاء مجموعة
            </Button>
          </div>

          {/* Create form */}
          {creating && (
            <div
              className="mb-6 p-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <p className="text-sm font-bold mb-3" dir="rtl" style={{ color: "hsl(130 42% 18%)" }}>
                اختر اسمًا للمجموعة
              </p>
              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-3" dir="rtl">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleCreate(p)}
                    className="px-3 py-1.5 rounded-full text-sm font-bold transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, hsla(130,42%,80%,0.60), hsla(160,40%,85%,0.50))",
                      color: "hsl(130 42% 22%)",
                      border: "1px solid rgba(255,255,255,0.80)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {/* Custom name */}
              <div className="flex gap-2" dir="rtl">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="اسم مخصص..."
                  dir="rtl"
                  className="rounded-full h-9 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(newName); }}
                />
                <Button size="sm" className="rounded-full shrink-0" onClick={() => handleCreate(newName)}>
                  إنشاء
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full shrink-0" onClick={() => setCreating(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {collections.length === 0 && !creating && (
            <div className="py-24 flex flex-col items-center gap-4 text-center">
              <div
                className="w-18 h-18 rounded-2xl flex items-center justify-center"
                style={{ background: "hsla(130,42%,84%,0.45)" }}
              >
                <FolderOpen size={36} style={{ color: "hsl(130 38% 50%)" }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: "hsl(130 42% 18%)" }}>
                لا توجد مجموعات بعد
              </h3>
              <p className="text-sm" style={{ color: "hsl(130 18% 52%)" }}>
                أنشئ مجموعاتك لتنظيم ملاحظاتك المفضلة
              </p>
              <Button className="rounded-full px-8 mt-1" onClick={() => setCreating(true)}>
                إنشاء أول مجموعة
              </Button>
            </div>
          )}

          {/* Collections grid */}
          {collections.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="group rounded-2xl overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.85)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* Gradient header */}
                  <div
                    className="h-20 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, hsla(130,42%,80%,0.55), hsla(25,78%,84%,0.45))",
                    }}
                  >
                    <BookOpen size={28} style={{ color: "hsl(130 42% 32%)", opacity: 0.7 }} />
                  </div>
                  {/* Info */}
                  <div className="p-4" dir="rtl">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-base mb-0.5" style={{ color: "hsl(130 42% 16%)" }}>
                          {col.name}
                        </h3>
                        <p className="text-xs" style={{ color: "hsl(130 18% 52%)" }}>
                          {col.noteIds.length} ملاحظة
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(col.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-all hover:bg-red-50"
                      >
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                    {col.noteIds.length === 0 ? (
                      <p className="text-xs mt-3 text-center py-3 rounded-xl"
                        style={{ background: "hsla(130,20%,92%,0.55)", color: "hsl(130 18% 56%)" }}>
                        لم تُضف ملاحظات بعد
                      </p>
                    ) : (
                      <Link href={`/notes`}>
                        <Button size="sm" variant="outline" className="w-full mt-3 rounded-full text-xs">
                          عرض الملاحظات
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
