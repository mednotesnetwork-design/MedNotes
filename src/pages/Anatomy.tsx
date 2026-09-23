import {Link} from 'wouter';
export function Anatomy(){return <><div className="study-return" dir="rtl"><Link href="/lectures">← العودة للمحاضرة المحفوظة</Link><span> الأطلس التجريبي · اسحبي للدوران، واستخدمي إصبعين للتكبير</span></div><iframe title="MedNote Upper Limb 3D atlas" src={import.meta.env.BASE_URL+'atlas.html'+window.location.search} className="atlas-frame" allow="fullscreen"/></>;}
