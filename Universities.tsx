import { useState } from "react";
import { Link } from "wouter";
import { Search, GraduationCap, MapPin, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListUniversities } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";

export function Universities() {
  const { data: universities, isLoading } = useListUniversities();
  const [search, setSearch] = useState("");
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const filteredUnis = universities?.filter(uni =>
    uni.name.toLowerCase().includes(search.toLowerCase()) ||
    (uni.nameAr ?? "").includes(search) ||
    (uni.city ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const featuredUni = filteredUnis?.find(u => u.featured);
  const otherUnis = filteredUnis?.filter(u => !u.featured);

  return (
    <div className="container mx-auto px-4 py-16 max-w-7xl">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h1 className="text-5xl font-extrabold tracking-tight mb-6 text-foreground">
          {t("universities.title")}
        </h1>
        <p className="text-xl text-muted-foreground mb-10 font-medium">
          {t("universities.subtitle")}
        </p>
        <div className="relative max-w-xl mx-auto shadow-xl rounded-full transform hover:scale-[1.02] transition-transform">
          <div className="absolute left-5 rtl:left-auto rtl:right-5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={22} />
          </div>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("universities.searchPlaceholder")}
            className="h-16 pl-14 rtl:pl-4 rtl:pr-14 rounded-full text-lg bg-white border-none focus-visible:ring-4 focus-visible:ring-primary/20 shadow-inner"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1,2,3,4,5,6,7,8].map(i => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Featured University — UQU */}
          {featuredUni && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-5">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold uppercase tracking-widest text-amber-600">{t("universities.featured")}</span>
              </div>
              <Link href={`/notes?universityId=${featuredUni.id}`}>
                <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-white to-secondary/5 overflow-hidden hover:-translate-y-1 hover:shadow-2xl hover:border-primary/60 transition-all duration-300 group cursor-pointer">
                  <div className="h-2 w-full bg-gradient-to-r from-primary via-purple-500 to-secondary"></div>
                  <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shadow-inner border-2 border-primary/15 shrink-0">
                      {featuredUni.logoUrl ? (
                        <img src={featuredUni.logoUrl} alt={featuredUni.name} className="w-20 h-20 object-contain rounded-full mix-blend-multiply" />
                      ) : (
                        <span className="text-5xl font-black">{featuredUni.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-start rtl:md:text-end">
                      <div className="flex items-center gap-2 justify-center md:justify-start rtl:md:justify-end mb-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs px-3">
                          {t("universities.featuredBadge")}
                        </Badge>
                      </div>
                      <h2 className="text-3xl font-extrabold text-foreground mb-1">{isRTL && featuredUni.nameAr ? featuredUni.nameAr : featuredUni.name}</h2>
                      {isRTL ? (
                        <p className="text-base text-muted-foreground font-medium mb-1">{featuredUni.name}</p>
                      ) : featuredUni.nameAr ? (
                        <p className="text-base text-muted-foreground font-medium mb-1" dir="rtl">{featuredUni.nameAr}</p>
                      ) : null}
                      <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center md:justify-start rtl:md:justify-end mb-4">
                        <MapPin size={14} className="text-primary/70" />
                        {featuredUni.city}, {featuredUni.country}
                      </p>
                      {featuredUni.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-xl mb-6">{featuredUni.description}</p>
                      )}
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold py-1.5 px-4 text-sm">
                        {t("universities.notesAvailable", { count: featuredUni.noteCount })}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}

          {/* Other Universities grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {otherUnis?.map(uni => (
              <Link key={uni.id} href={`/notes?universityId=${uni.id}`}>
                <Card className="h-full border-border bg-white overflow-hidden hover:-translate-y-2 hover:shadow-xl hover:border-primary/40 transition-all duration-300 group cursor-pointer">
                  <div className="h-1.5 w-full bg-gradient-to-r from-primary to-secondary opacity-70 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="p-6 flex flex-col h-full items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-5 text-primary group-hover:scale-110 transition-transform duration-300 shadow-inner border border-primary/5">
                      {uni.logoUrl ? (
                        <img src={uni.logoUrl} alt={uni.name} className="w-14 h-14 object-contain rounded-full mix-blend-multiply" />
                      ) : (
                        <span className="text-3xl font-black">{uni.name.charAt(0)}</span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-base line-clamp-2 leading-snug mb-1 text-foreground">
                      {isRTL && uni.nameAr ? uni.nameAr : uni.name}
                    </h3>
                    {isRTL && uni.name && (
                      <p className="text-xs text-muted-foreground/70 line-clamp-1 mb-1">{uni.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mb-5">
                      <MapPin size={12} className="text-primary/70 shrink-0" />
                      {uni.city ? `${uni.city}` : uni.country}
                    </p>
                    <div className="mt-auto w-full pt-4 border-t border-border">
                      <Badge variant="secondary" className="w-full justify-center bg-muted/60 text-foreground py-1.5 text-xs">
                        {t("universities.notesAvailable", { count: uni.noteCount })}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {filteredUnis?.length === 0 && !isLoading && (
        <div className="text-center py-32 bg-white rounded-3xl border border-border border-dashed shadow-sm">
          <GraduationCap className="mx-auto h-16 w-16 text-muted-foreground/30 mb-6" />
          <h3 className="text-2xl font-extrabold mb-3">{t("universities.notFound.title")}</h3>
          <p className="text-muted-foreground font-medium text-lg">{t("universities.notFound.desc")}</p>
        </div>
      )}
    </div>
  );
}
