import {Link} from 'wouter';
export function Anatomy(){
 const params=new URLSearchParams(window.location.search);params.set('embedded','1');
 return <div className="anatomy-workspace"><div className="study-return" dir="rtl"><Link href="/lectures">← العودة للمحاضرة المحفوظة</Link><span>اسحبي للدوران، واستخدمي إصبعين للتكبير</span></div><iframe title="MedNote Upper Limb 3D atlas" src={import.meta.env.BASE_URL+'atlas.html?'+params.toString()} className="atlas-frame" allow="fullscreen"/></div>;
}
