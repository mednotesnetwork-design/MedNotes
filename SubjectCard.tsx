import { Link } from "wouter";
import { FileText, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

// ─── Module Card ─────────────────────────────────────────────────────────────
interface ModuleCardProps {
  id: number;
  name: string;
  code?: string | null;
  universityName?: string | null;
  subjectCount: number;
  noteCount: number;
}

export function ModuleCard({ id, name, code, universityName, subjectCount, noteCount }: ModuleCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/notes?moduleId=${id}`}>
      <div className="group flex flex-col bg-white border border-border rounded-xl p-5 card-hover h-full relative overflow-hidden">
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/20 group-hover:bg-primary group-hover:w-[3px] transition-all duration-200 rtl:left-auto rtl:right-0" />

        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/14 transition-colors">
            <BookOpen size={16} />
          </div>
          {code && (
            <Badge
              variant="secondary"
              className="bg-primary/8 text-primary border-0 font-bold text-[11px] rounded-md shrink-0"
            >
              {code}
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-base text-foreground leading-snug mb-1 line-clamp-2">
          {name}
        </h3>

        {universityName && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{universityName}</p>
        )}

        <div className="mt-auto flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span>{t("home.modules.subjects", { count: subjectCount })}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{t("home.modules.notes", { count: noteCount })}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────────
interface SubjectCardProps {
  id: number;
  name: string;
  moduleName?: string | null;
  noteCount: number;
}

export function SubjectCard({ id, name, moduleName, noteCount }: SubjectCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/notes?subjectId=${id}`}>
      <div className="group flex flex-col bg-white border border-border rounded-lg p-4 card-hover h-full relative overflow-hidden">
        {/* Left accent */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/25 group-hover:bg-primary group-hover:w-[3px] transition-all duration-200 rtl:left-auto rtl:right-0" />

        <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug mb-1.5">
          {name}
        </h3>

        {moduleName && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{moduleName}</p>
        )}

        <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FileText size={11} className="text-primary/60 shrink-0" />
          <span>{t("home.subjects.notes", { count: noteCount })}</span>
        </div>
      </div>
    </Link>
  );
}
