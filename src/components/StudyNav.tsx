import { Link, useLocation } from 'wouter';
import { Home, BookOpen, ScanLine, Microscope, Library } from 'lucide-react';
const sections = [
  { href:'/', label:'الرئيسية', Icon:Home },
  { href:'/lectures', label:'المحاضرات التفاعلية', Icon:BookOpen },
  { href:'/anatomy', label:'أطلس 3D', Icon:ScanLine },
  { href:'/research', label:'Research Mentor', Icon:Microscope },
  { href:'/notes', label:'الملاحظات', Icon:Library },
];
export function StudyNav() {
  const [location] = useLocation();
  return <nav className="study-nav" aria-label="مساحات MedNote">
    {sections.map(({href,label,Icon})=><Link key={href} href={href} aria-current={location===href?'page':undefined}><Icon size={17}/><span>{label}</span></Link>)}
  </nav>;
}
