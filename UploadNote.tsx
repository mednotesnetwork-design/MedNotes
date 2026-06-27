import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, FileUp, Info, CheckCircle2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SearchableCombobox } from "@/components/SearchableCombobox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useListUniversities, useListModules, useListSubjects, useCreateNote, getListNotesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { saveFile } from "@/lib/idb";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const uploadSchema = z.object({
  title: z.string().min(5, "العنوان يجب أن يكون 5 أحرف على الأقل").max(100),
  description: z.string().optional(),
  universityId: z.string().min(1, "الرجاء اختيار الجامعة"),
  moduleId: z.string().min(1, "الرجاء اختيار الموديول"),
  subjectId: z.string().min(1, "الرجاء اختيار المادة"),
  contentType: z.string().min(1, "الرجاء اختيار نوع المحتوى"),
  authorName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  year: z.string().optional().refine(val => !val || !isNaN(Number(val)), "يجب أن يكون رقمًا صحيحًا"),
  tags: z.string().optional()
});

type UploadFormValues = z.infer<typeof uploadSchema>;

function detectFormat(file: File): string {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (mime.includes("wordprocessingml") || name.endsWith(".docx") || name.endsWith(".doc")) return "DOCX";
  if (mime.includes("presentationml") || name.endsWith(".pptx") || name.endsWith(".ppt")) return "PPTX";
  if (mime.startsWith("image/")) return "Image";
  return "FILE";
}

type UploadStage = "idle" | "uploading" | "saving";

export function UploadNote() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createNote = useCreateNote();
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState(0);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
      universityId: "",
      moduleId: "",
      subjectId: "",
      contentType: "",
      authorName: "",
      year: "",
      tags: ""
    }
  });

  const { data: universities } = useListUniversities();
  const { data: modules } = useListModules({});
  const { data: subjects } = useListSubjects({});

  const handleFileSelect = (file: File | null) => {
    if (!file) { setSelectedFile(null); return; }
    if (file.size > MAX_FILE_BYTES) {
      toast({
        title: "الملف كبير جدًا",
        description: "الحد الأقصى لحجم الملف هو 50 ميجابايت. الرجاء اختيار ملف أصغر.",
        variant: "destructive"
      });
      return;
    }
    setSelectedFile(file);
  };

  const isLoading = uploadStage !== "idle";

  const onSubmit = async (data: UploadFormValues) => {
    if (isLoading) return;

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;

    try {
      if (selectedFile) {
        setUploadStage("uploading");
        setProgress(0);
        const fileId = await saveFile(selectedFile);
        setProgress(100);
        fileUrl = "idb:" + fileId;
        fileName = selectedFile.name;
        fileSize = selectedFile.size;
      }

      setUploadStage("saving");
      const newNote = await createNote.mutateAsync({
        data: {
          title: data.title,
          description: data.description,
          universityId: parseInt(data.universityId),
          moduleId: parseInt(data.moduleId),
          subjectId: parseInt(data.subjectId),
          fileType: data.contentType,
          fileUrl,
          fileName,
          fileSize,
          authorName: data.authorName,
          year: data.year ? parseInt(data.year) : undefined,
          tags: data.tags,
        }
      });

      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      toast({ title: "تم النشر بنجاح! 🎉", description: "تم نشر ملاحظتك وأصبحت متاحة للجميع." });
      setLocation(`/notes/${newNote.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("upload.errorDesc");
      toast({ title: t("upload.errorTitle"), description: message, variant: "destructive" });
      setUploadStage("idle");
    }
  };

  const fileFormat = selectedFile ? detectFormat(selectedFile) : null;

  const buttonLabel = () => {
    if (uploadStage === "uploading") return (
      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> جاري رفع الملف...</>
    );
    if (uploadStage === "saving") return (
      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> جارٍ الحفظ...</>
    );
    return <><Upload size={18} /> {t("upload.submit")}</>;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
          <FileUp size={32} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t("upload.title")}</h1>
        <p className="text-muted-foreground">{t("upload.subtitle")}</p>
      </div>

      <Card className="border-border/60 shadow-lg">
        <CardHeader className="bg-muted/30 border-b border-border/40 pb-6">
          <CardTitle className="flex items-center gap-2">
            <Info size={18} className="text-primary" /> {t("upload.guidelines")}
          </CardTitle>
          <CardDescription>
            {t("upload.guidelinesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* Section 1: Academic Context */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">{t("upload.section1")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="universityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("upload.university")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("upload.selectUniversity")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {universities?.map(u => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="moduleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("upload.module")}</FormLabel>
                        <FormControl>
                          <SearchableCombobox
                            options={modules?.map(m => ({
                              value: m.id.toString(),
                              label: m.nameAr ? `${m.name} — ${m.nameAr}` : m.name,
                            })) ?? []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("upload.selectModule")}
                            searchPlaceholder="ابحث عن موديول... Search module"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("upload.subject")}</FormLabel>
                        <FormControl>
                          <SearchableCombobox
                            options={subjects?.map(s => ({ value: s.id.toString(), label: s.name })) ?? []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("upload.selectSubject")}
                            searchPlaceholder="ابحث عن مادة..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 2: Note Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">{t("upload.section2")}</h3>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("upload.title_field")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("upload.titlePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("upload.description")}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t("upload.descPlaceholder")} className="resize-none h-24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("upload.tags")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("upload.tagsPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("upload.batchNumber")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("upload.batchPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 3: File */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">{t("upload.section3")}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع الملاحظة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر نوع الملاحظة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ملخصات">ملخصات</SelectItem>
                            <SelectItem value="تفريغات">تفريغات</SelectItem>
                            <SelectItem value="شروحات">شروحات</SelectItem>
                            <SelectItem value="أسئلة">أسئلة</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="authorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("upload.authorName")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("upload.authorPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* File picker */}
                <div className="space-y-1.5">
                  <label
                    className="text-sm font-medium leading-none"
                    style={{ color: "hsl(130 42% 14%)" }}
                  >
                    {t("upload.fileUpload")}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(الحد الأقصى: 50 ميجابايت)</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  />

                  {selectedFile ? (
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        background: "linear-gradient(135deg,hsla(130,42%,84%,0.55),hsla(50,80%,88%,0.50))",
                        border: "1px solid rgba(255,255,255,0.75)",
                      }}
                      onClick={() => !isLoading && fileInputRef.current?.click()}
                    >
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: "hsl(130 40% 18%)" }}>
                        {selectedFile.name}
                      </span>
                      {fileFormat && (
                        <Badge variant="secondary" className="shrink-0 text-xs font-bold uppercase">
                          {fileFormat}
                        </Badge>
                      )}
                      <span className="text-xs shrink-0" style={{ color: "hsl(130 14% 50%)" }}>
                        {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-rose-400 hover:text-rose-600 transition-colors"
                        disabled={isLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleFileSelect(e.dataTransfer.files?.[0] ?? null);
                      }}
                      className="w-full flex flex-col items-center justify-center gap-2 px-4 py-7 rounded-xl border-2 border-dashed transition-all"
                      style={{
                        background: isDragging
                          ? "linear-gradient(135deg,hsla(130,42%,88%,0.70),hsla(50,80%,90%,0.65))"
                          : "linear-gradient(135deg,hsla(50,78%,92%,0.55),hsla(25,76%,92%,0.45))",
                        borderColor: isDragging
                          ? "hsl(130,42%,52%)"
                          : "hsla(130,32%,60%,0.35)",
                        transform: isDragging ? "scale(1.01)" : "scale(1)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: isDragging ? "rgba(78,138,89,0.22)" : "rgba(78,138,89,0.12)" }}
                      >
                        <Paperclip size={18} className="text-primary" />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "hsl(130 38% 28%)" }}>
                        {isDragging ? "أفلت الملف هنا" : t("upload.fileUploadPlaceholder")}
                      </span>
                      <span className="text-xs" style={{ color: "hsl(130 12% 50%)" }}>
                        PDF · DOCX · PPTX · صور — حتى 50 ميجابايت
                      </span>
                    </button>
                  )}

                  {/* Upload progress bar */}
                  {uploadStage === "uploading" && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-medium" style={{ color: "hsl(130 38% 28%)" }}>
                        <span>جاري رفع الملف...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            background: "linear-gradient(90deg, hsl(130,42%,46%), hsl(90,60%,52%))",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full md:w-auto px-12 gap-2"
                  disabled={isLoading}
                >
                  {buttonLabel()}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
