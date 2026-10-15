import {useMemo,useState} from 'react';
import {Link} from 'wouter';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,Clock3,Copy,HeartHandshake,Mail,ShieldCheck,Sparkles,Users,UserRound,Video,LockKeyhole} from 'lucide-react';
import './membership.css';

type Invite={email:string;state:'pending'|'accepted'|'declined'};
const prices={1:18,2:15,3:12} as const;
type Size=1|2|3;
const sar=(price:number)=>price.toLocaleString('ar-SA',{minimumFractionDigits:0,maximumFractionDigits:0});
const validEmail=(email:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)&&email.length<=254;

export function Membership(){
 const [size,setSize]=useState<Size>(3);
 const [email,setEmail]=useState('');
 const [invites,setInvites]=useState<Invite[]>([]);
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const price=prices[size],maxInvites=size-1;
 const shown=invites.slice(0,maxInvites);
 const accepted=shown.filter(i=>i.state==='accepted').length;
 const pending=shown.filter(i=>i.state==='pending').length;
 const allAccepted=shown.length===maxInvites&&pending===0&&shown.every(i=>i.state==='accepted');
 const stage=size===1?'اختيار فردي':allAccepted?'العضوات موافقات':pending>0?'بانتظار موافقة المدعوات':'ابدئي بإرسال الدعوات';
 const estimatedTotal=price*size;
 const reduction=Math.round((1-price/18)*100);
 const onSize=(n:Size)=>{setSize(n);setEmail('');setInvites([]);setError('');setCopied(false);};
 function invite(){
  const normalized=email.trim().toLowerCase();
  if(!validEmail(normalized)){setError('اكتبي بريدًا إلكترونيًا صحيحًا.');return;}
  if(shown.some(i=>i.email===normalized)){setError('هذا البريد موجود بالفعل.');return;}
  if(shown.length>=maxInvites){setError('اكتمل عدد المدعوات في مجموعتك.');return;}
  setInvites(items=>[...items.slice(0,maxInvites),{email:normalized,state:'pending'}]);
  setEmail('');setError('');
 }
 function setStatus(index:number,status:Invite['state']){
  setInvites(items=>items.map((item,i)=>i===index?{...item,state:status}:item));
 }
 async function copySummary(){
  const message='MedNote Student • اشتراك 60 يومًا\n'+
   'المجموعة: '+size+' طالبات\n'+
   'السعر للطالبة: '+price+' ر.س\n'+
   'حساب مستقل لكل طالبة. المعاينة تجريبية ولا ترسل دعوات ولا تستقبل دفعات.';
  try{await navigator.clipboard.writeText(message);setCopied(true);}catch{setCopied(false);}
 }
 return <div className="mn-member" dir="rtl">
  <div className="mn-member-inner">
   <nav className="mn-member-crumb" aria-label="مسار الصفحة"><Link href="/lectures"><BookOpen size={15}/> شارح المحاضرات</Link><ArrowLeft size={14}/><span>اشتراك الطالبات</span></nav>
   <div className="mn-member-hero">
    <div className="mn-member-intro">
     <div className="mn-member-eyebrow"><Sparkles size={15}/> MEDNOTE STUDENT PASS <span>·</span> MODULE ACCESS</div>
     <h1>مذاكرة الموديول.<br/><em>سوا، بس كل وحدة بحسابها.</em></h1>
     <p>اشتراك واحد يشمل المحاضرات التفاعلية ومكتبة الصور والفيديوهات الطبية المشتركة، لمدة 60 يومًا. جيبي زميلاتك وخفّضي السعر بدون مشاركة الحساب أو أسئلتك الخاصة.</p>
     <div className="mn-member-facts"><span><Clock3 size={16}/> 60 يومًا</span><span><ShieldCheck size={16}/> حسابات مستقلة</span><span><Video size={16}/> مكتبة وسائط مشتركة</span></div>
    </div>
    <div className="mn-member-feature"><span className="mn-member-feature-title">ONE PASS · ALL STUDY TOOLS</span><div className="mn-member-feature-bill"><small>ابتداءً من</small><strong><b>12</b> ر.س</strong><span>للطالبة / 60 يومًا</span></div><div className="mn-member-feature-line"/><p>سعر العرض عند اشتراك ثلاث طالبات. نفس المميزات التعليمية للجميع.</p><span className="mn-member-preview">معاينة تفاعلية · لا يتم تحصيل مدفوعات</span></div>
   </div>
   <section className="mn-member-panel" aria-labelledby="choose-title">
    <div className="mn-member-sectionhead"><div><span>01 / YOUR PLAN</span><h2 id="choose-title">اختاري عدد الطالبات</h2><p>السعر محسوب لكل طالبة، وليس سعر المجموعة كلها.</p></div><div className="mn-member-duration"><Clock3 size={17}/> 60 يومًا لكل الاشتراكات</div></div>
    <div className="mn-member-choices">
      {([1,2,3] as Size[]).map(n=><button type="button" key={n} onClick={()=>onSize(n)} className={'mn-member-choice '+(size===n?'is-selected':'')} aria-pressed={size===n}>
        <span className="mn-member-choice-top"><span>{n===1?'طالبة واحدة':n===2?'طالبتان':'ثلاث طالبات'}</span>{size===n?<CheckCircle2 size={19}/>:<Users size={19}/>}</span>
        <span className="mn-member-choice-number"><strong>{sar(prices[n])}</strong><small>ر.س / طالبة</small></span>
        <span className="mn-member-choice-bottom">{n===1?'السعر الفردي':n===2?'خصم 17% للطالبة':'خصم 33% للطالبة'}</span>
      </button>)}
    </div>
    <div className="mn-member-pricingline">
      <div><small>للطالبة الواحدة</small><strong>{price} ر.س</strong></div>
      <span className="mn-member-times">× {size} {size===1?'طالبة':'طالبات'}</span>
      <div><small>إجمالي المجموعة</small><strong>{estimatedTotal} ر.س</strong></div>
      <span className="mn-member-discount">توفير {reduction}% لكل طالبة</span>
    </div>
   </section>
   <div className="mn-member-grid">
    <section className="mn-member-invites" aria-labelledby="invite-title">
      <div className="mn-member-sectionhead"><div><span>02 / INVITATIONS</span><h2 id="invite-title">{size===1?'مقعدك جاهز':'كوّني مجموعتك'}</h2><p>{size===1?'حساب واحد ومكتبة MedNote كاملة.':'كل زميلة تتلقى دعوة وتوافق من حسابها قبل تفعيل المجموعة.'}</p></div></div>
      <div className="mn-member-owner"><span className="mn-member-avatar"><UserRound size={19}/></span><div><strong>أنتِ · صاحبة الدعوة</strong><small>حساب شخصي مستقل</small></div><span className="mn-member-owner-ok"><Check size={16}/> أساسي</span></div>
      {size>1&&<>
       {shown.map((item,i)=><div className="mn-member-invite" key={item.email}>
        <span className="mn-member-avatar"><Mail size={19}/></span>
        <div><strong dir="ltr">{item.email}</strong><small>{item.state==='accepted'?'وافقت على الانضمام (تجربة)':item.state==='declined'?'رفضت الدعوة (تجربة)':'بانتظار الموافقة (تجربة)'}</small></div>
        <span className={'mn-member-invite-status '+(item.state==='accepted'?'yes':item.state==='declined'?'no':'')}>{item.state==='accepted'?'موافقة':item.state==='declined'?'مرفوضة':'قيد الانتظار'}</span>
        {item.state==='pending'&&<button type="button" className="mn-member-test" onClick={()=>setStatus(i,'accepted')}>جرّبي القبول</button>}
        {item.state==='declined'&&<button type="button" className="mn-member-test" onClick={()=>setInvites(items=>items.filter((_,j)=>j!==i))}>حذف الدعوة</button>}
       </div>)}
       {shown.length<maxInvites&&<form className="mn-member-inviteform" onSubmit={e=>{e.preventDefault();invite();}}>
        <label htmlFor="mn-member-email">البريد الجامعي للزميلة ({shown.length+1} من {maxInvites})</label>
        <div className="mn-member-inputrow"><input id="mn-member-email" dir="ltr" type="email" autoComplete="off" value={email} onChange={e=>{setEmail(e.target.value);setError('');}} placeholder="student@uqu.edu.sa" required/><button type="submit">إضافة دعوة <ArrowLeft size={16}/></button></div>
        {error&&<small role="alert" className="mn-member-formerror">{error}</small>}
        <p>في المعاينة تُضاف الدعوة على هذه الصفحة فقط؛ **لا تُرسل رسالة بريدية**.</p>
       </form>}
       <p className="mn-member-no-pretend"><LockKeyhole size={15}/> القبول الفعلي سيتطلب دخول الزميلة إلى حسابها والتحقق من البريد؛ زر «جرّبي القبول» محاكاة فقط.</p>
      </>}
      {size===1&&<div className="mn-member-single"><CheckCircle2 size={24}/><p>ما تحتاجين أي دعوات. المدة والمميزات نفسها تمامًا، والسعر 18 ريالًا.</p></div>}
    </section>
    <aside className="mn-member-checkout" aria-labelledby="review-title">
      <div className="mn-member-checkout-top"><span>03 / SUBSCRIPTION SUMMARY</span><h2 id="review-title">ملخص الاشتراك</h2></div>
      <div className="mn-member-orderline"><span>الباقة</span><strong>MedNote Student</strong></div>
      <div className="mn-member-orderline"><span>عدد الحسابات</span><strong>{size}</strong></div>
      <div className="mn-member-orderline"><span>المدة</span><strong>60 يومًا</strong></div>
      <div className="mn-member-orderline"><span>حالة المجموعة</span><strong>{stage}</strong></div>
      <div className="mn-member-orderline"><span>الموافقات التجريبية</span><strong>{size===1?'لا توجد دعوات':accepted+' من '+maxInvites}</strong></div>
      <div className="mn-member-order-total"><span>السعر لكل طالبة</span><strong>{price} <small>ر.س</small></strong></div>
      <div className="mn-member-checkout-foot"><button type="button" onClick={()=>{void copySummary();}}><Copy size={16}/>{copied?'تم نسخ الملخص':'نسخ تفاصيل العرض'}</button><button type="button" disabled className="mn-member-disabled">الدفع غير مفعل في المعاينة</button><p>لن يتم سحب مبلغ أو إرسال دعوات فعلية. التفعيل يتطلب حسابات موثقة وموافقة الأطراف وربط بوابة الدفع.</p></div>
    </aside>
   </div>
   <section className="mn-member-benefits"><div><span>WHAT IS INCLUDED</span><h2>مميزات واحدة لكل الطالبات.</h2><p>لا يوجد اشتراك Plus؛ كل المشتركات يحصلن على نفس الأدوات، بما فيها الفيديوهات والرسوم عالية الجودة الموجودة في المكتبة.</p></div><div className="mn-member-benefit-list"><span><BookOpen size={17}/> المحاضرات المعاد بناؤها</span><span><Video size={17}/> الفيديوهات الطبية المشتركة</span><span><Sparkles size={17}/> الصور والميكانيزمات التعليمية</span><span><HeartHandshake size={17}/> أسئلة AI شخصية داخل المحاضرة</span></div></section>
   <footer className="mn-member-footer"><span>MEDNOTE · 60-DAY MODULE PASS</span><Link href="/lectures">العودة للشارح <ArrowLeft size={16}/></Link></footer>
  </div>
 </div>;
}
