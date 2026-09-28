import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpen, ScanLine, Microscope, ArrowUpLeft } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { StudyNav } from './StudyNav';
const modules = [
  {href:'/lectures', Icon:BookOpen, label:'المحاضرات التفاعلية', meta:'LECTURES', text:'شريحتك الأصلية، شرحها، وأسئلة تختبر فهمك.'},
  {href:'/anatomy', Icon:ScanLine, label:'أطلس الطرف العلوي', meta:'ANATOMY', text:'استكشفي التراكيب والعلاقات التشريحية في 3D.'},
  {href:'/research', Icon:Microscope, label:'Research Mentor', meta:'RESEARCH', text:'ناقشي السؤال والتصميم، واحتفظي بقرارات بحثك.'},
];
export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isStudy = ['/anatomy','/lectures','/research'].includes(location);
  return <div className={'mednote-shell '+(isStudy?'study-shell':'community-shell')}>
    <a className="mednote-skip-link" href="#main-content">انتقلي إلى المحتوى</a>
    <Header/><StudyNav/>
    {location==='/'&&<section className="study-page study-home" dir="rtl" aria-labelledby="study-heading">
      <div className="study-title"><div><span className="mednote-eyebrow">MEDNOTE WORKSPACE</span><h1 id="study-heading">مساحة الدراسة</h1></div><span className="study-home-caption">تعلّمي · استكشفي · ابحثي</span></div>
      <div className="module-cards">{modules.map(({href,Icon,label,meta,text})=><Link key={href} href={href}><div className="module-card-top"><Icon size={24} strokeWidth={1.5}/><span>{meta}</span><ArrowUpLeft size={17}/></div><h2>{label}</h2><p>{text}</p><span className="module-open">افتحي المساحة <ArrowUpLeft size={14}/></span></Link>)}</div>
      <p className="study-note">خدمات المجتمع والمزامنة والحسابات لم تُوصَل بعد في هذه النسخة.</p>
    </section>}
    <main id="main-content" className="mednote-main">{children}</main>
    {!isStudy&&<Footer/>}
  </div>;
}
