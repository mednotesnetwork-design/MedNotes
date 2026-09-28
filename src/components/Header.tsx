import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, Globe, Upload, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useLanguage } from '@/hooks/use-language';
import { useTranslation } from 'react-i18next';
import { AppLogo } from './AppLogo';

const communityLinks = [
  ['/', 'الرئيسية'], ['/discover', 'اكتشف'], ['/universities', 'الجامعات'],
  ['/modules', 'المواد'], ['/notes', 'الملاحظات'], ['/notes?type=summary', 'الملخصات'],
  ['/notes?type=transcription', 'التفريغات'], ['/notes?type=explanation', 'الشروحات'],
  ['/notes?type=questions', 'بنك الأسئلة'], ['/groups', 'المجموعات'],
  ['/contributors', 'المساهمون'], ['/collections', 'مجموعاتي'], ['/favorites', 'المفضلة'],
];
const studyLinks = [['/lectures','المحاضرات التفاعلية'],['/research','Research Mentor'],['/anatomy','أطلس الطرف العلوي']];
export function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const section = studyLinks.find(([href]) => href === location)?.[1] || 'مساحة التعلّم';
  return <header className="mednote-header">
    <Link href="/" className="mednote-brand" aria-label="MedNote home"><AppLogo size={39}/><strong>MedNote</strong><span>STUDY</span></Link>
    <div className="mednote-breadcrumb"><span>WORKSPACE</span><ChevronRight size={14}/><span dir="auto">{section}</span></div>
    <div className="mednote-header-actions">
      <button type="button" onClick={toggleLanguage} className="mednote-quiet-button" aria-label={t('common.language')}><Globe size={16}/><span>{t('common.language')}</span></button>
      <Link href="/upload" className="mednote-upload"><Upload size={15}/><span>{t('nav.upload')}</span></Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><button type="button" className="mednote-quiet-button" aria-label="فتح قائمة MedNote"><Menu size={20}/></button></SheetTrigger>
        <SheetContent className="mednote-menu" side="right" dir="rtl">
          <SheetTitle>MedNote</SheetTitle><SheetDescription>الدراسة والمحتوى والمجتمع</SheetDescription>
          <nav aria-label="جميع أقسام MedNote">
            <p className="mednote-eyebrow">مساحة الدراسة</p>
            {studyLinks.map(([href,label])=><Link key={href} href={href} aria-current={location===href?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}
            <p className="mednote-eyebrow">المحتوى والمجتمع</p>
            {communityLinks.map(([href,label])=><Link key={href} href={href} aria-current={location===href?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  </header>;
}
