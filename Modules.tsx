import { useState } from "react";
import { Link } from "wouter";
import { Search, Library, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListModules, useListUniversities } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

export function Modules() {
  const [search, setSearch] = useState("");
  const [universityId, setUniversityId] = useState<string>("all");
  const { t } = useTranslation();
  
  const { data: universities } = useListUniversities();
  const { data: modules, isLoading } = useListModules(
    universityId !== "all" ? { universityId: parseInt(universityId) } : {}
  );

  const filteredModules = modules?.filter(mod => 
    mod.name.toLowerCase().includes(search.toLowerCase()) || 
    (mod.code && mod.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-16 max-w-7xl">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-5xl font-extrabold tracking-tight mb-6 text-foreground">
          {t("modules.title")}
        </h1>
        <p className="text-xl text-muted-foreground mb-10 font-medium">
          {t("modules.subtitle")}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-3 rounded-3xl shadow-lg border border-border/50">
          <div className="relative flex-1">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground rtl:right-5 rtl:left-auto">
              <Search size={20} className="flip-rtl" />
            </div>
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("modules.searchPlaceholder")} 
              className="h-14 pl-14 rtl:pl-4 rtl:pr-14 bg-muted/20 border-transparent rounded-2xl text-lg focus-visible:ring-primary/20"
            />
          </div>
          <div className="sm:w-72 shrink-0">
            <Select value={universityId} onValueChange={setUniversityId}>
              <SelectTrigger className="h-14 bg-muted/20 border-transparent rounded-2xl text-base font-semibold">
                <SelectValue placeholder={t("modules.allUniversities")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("modules.allUniversities")}</SelectItem>
                {universities?.map(uni => (
                  <SelectItem key={uni.id} value={uni.id.toString()}>
                    {uni.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredModules?.map(mod => (
            <Link key={mod.id} href={`/notes?moduleId=${mod.id}`} className="block">
              <Card className="h-full border border-border bg-white hover:-translate-y-1 hover:shadow-xl hover:border-primary/30 transition-all duration-300 relative group overflow-hidden">
                <div className="absolute top-0 left-0 rtl:right-0 rtl:left-auto w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
                <CardContent className="p-7 flex flex-col h-full pl-8 rtl:pr-8 rtl:pl-7">
                  <div className="flex justify-between items-start mb-4">
                    {mod.code && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary font-bold px-3 py-1 text-xs">
                        <Layers size={14} className="mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                        {mod.code}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground font-extrabold bg-muted/50 px-3 py-1 rounded-full ml-auto rtl:mr-auto rtl:ml-0">
                      {t("modules.notes", { count: mod.noteCount })}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xl line-clamp-2 mb-2 leading-snug text-foreground">{mod.name}</h3>
                  <p className="text-sm font-semibold text-muted-foreground mb-4 line-clamp-1">{mod.universityName}</p>
                  
                  {mod.description && (
                    <p className="text-sm text-muted-foreground/80 mt-auto line-clamp-2 leading-relaxed">
                      {mod.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {filteredModules?.length === 0 && !isLoading && (
        <div className="text-center py-32 bg-white rounded-3xl border border-border border-dashed shadow-sm">
          <Library className="mx-auto h-16 w-16 text-muted-foreground/30 mb-6" />
          <h3 className="text-2xl font-extrabold mb-3">{t("modules.notFound.title")}</h3>
          <p className="text-muted-foreground font-medium text-lg">{t("modules.notFound.desc")}</p>
        </div>
      )}
    </div>
  );
}