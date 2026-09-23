import { Link } from "wouter";
import { Upload, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export function UploadSection() {
  const { t } = useTranslation();

  return (
    <section className="container mx-auto px-4 max-w-7xl">
      <div className="rounded-2xl overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/5 via-white to-secondary/5">
        <div className="px-8 py-12 md:px-12 flex flex-col md:flex-row items-center gap-10">

          {/* Copy */}
          <div className="flex-1 text-center md:text-start rtl:md:text-end">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <Upload size={12} />
              {t("upload.ctaTag") ?? "Contribute"}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3 leading-tight">
              {t("upload.ctaHeading") ?? "Share your notes with fellow students"}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md">
              {t("upload.ctaDesc") ?? "Upload your study notes, summaries, and revision materials to help Saudi medical students across the Kingdom."}
            </p>

            {/* Feature list */}
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              {[
                { icon: FileText, text: t("upload.ctaBullet1") ?? "Supports PDF, Word, and image files" },
                { icon: Users,    text: t("upload.ctaBullet2") ?? "Instantly visible to students at your university" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 justify-center md:justify-start rtl:md:justify-end">
                  <Icon size={14} className="text-primary/70 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="shrink-0 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Upload size={32} className="text-primary" />
            </div>
            <Link href="/upload">
              <Button className="h-11 px-8 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 shadow-sm hover:shadow-md transition-all">
                {t("footer.uploadCta")}
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              {t("upload.ctaNote") ?? "Free to upload and share"}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
