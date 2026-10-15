import {useState} from 'react';
import type {SharedMedia} from '../../lib/shared-learning';
/** Only server-approved library assets. Opening a medium never generates it. */
export function ReusableMedia({media}:{media:SharedMedia[]}){
 const [selected,setSelected]=useState<string>(),[failed,setFailed]=useState(false);
 const active=media.find(m=>m.id===selected);
 if(!media.length)return null;
 return <section className="mn10-media" aria-label="وسائط هذا المفهوم">
  <header><span>مكتبة هذا المفهوم</span><small>وسائط محفوظة · لا يُطلب توليد جديد عند المشاهدة</small></header>
  <div className="mn10-media-options">{media.map(m=><button key={m.id} aria-pressed={selected===m.id} onClick={()=>{setSelected(selected===m.id?undefined:m.id);setFailed(false)}}>{m.kind==='video'?'▶ فيديو':m.kind==='image'?'صورة':'3D'} · {m.title}</button>)}</div>
  {active&&<figure key={active.id}>{failed?<p role="alert">تعذر تحميل هذه الوسيلة. يمكنك متابعة الشرح أو إعادة فتحها.</p>:active.kind==='video'?<video src={active.url} controls playsInline preload="none" onError={()=>setFailed(true)} aria-label={active.title}/>:active.kind==='image'?<img src={active.url} alt={active.title} loading="lazy" onError={()=>setFailed(true)}/>:<iframe src={active.url} title={active.title} loading="lazy" sandbox="allow-scripts" referrerPolicy="no-referrer" allow="fullscreen"/>}<figcaption>{active.description} · إصدار {active.version}</figcaption></figure>}
 </section>;
}
