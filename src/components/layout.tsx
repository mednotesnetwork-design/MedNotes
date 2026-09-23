import React from "react";
import {Link,useLocation} from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StudyNav } from './StudyNav';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location]=useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StudyNav />
      {location==='/'&&<section className="study-page" dir="rtl"><h1>مساحة الدراسة</h1><div className="module-cards"><Link href="/lectures"><strong>المحاضرة التفاعلية</strong><p>افتحي PDF أو ابدئي رحلة العصب الكعبري: شرح، أسئلة، واستكشاف 3D.</p></Link><Link href="/anatomy"><strong>أطلس الطرف العلوي</strong><p>ابحثي عن تركيب، اعزليه، واستكشفي علاقاته ومعالمه وارتباطاته السريرية.</p></Link><Link href="/research"><strong>Research Mentor</strong><p>ناقشي مشروعك واحفظي السؤال والتصميم والقرارات. تجربة V1.</p></Link></div><p className="study-note">مساحة الدراسة متاحة هنا. خدمات رفع الملاحظات المجتمعية والمزامنة والحسابات لا تزال غير موصولة في هذه النسخة.</p></section>}
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
