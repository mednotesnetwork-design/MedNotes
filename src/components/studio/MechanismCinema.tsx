import {useEffect,useState} from 'react';
import {Pause,Play,RotateCcw,ChevronLeft,ChevronRight,Clapperboard} from 'lucide-react';
import {MedicalVisual} from './MedicalVisual';
import type {Source,TeachingChapter} from './studio-types';

export function MechanismCinema({lesson,sources,start=0}:{lesson:TeachingChapter;sources:Source[];start?:number}){
 const steps=lesson.mechanism;
 const [active,setActive]=useState(start),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
 useEffect(()=>{setActive(start);setPlaying(false)},[lesson,start]);
 useEffect(()=>{
  if(!playing||steps.length<2)return;
  const id=window.setInterval(()=>setActive(i=>(i+1)%steps.length),4800/speed);
  return()=>window.clearInterval(id);
 },[playing,speed,steps.length]);
 if(!steps.length)return null;
 const current=steps[Math.min(active,steps.length-1)];
 const local=sources.filter(p=>current.source_ids.includes(p.id));
 function move(n:number){setActive((n+steps.length)%steps.length);setPlaying(false)}
 return <section className="mn7-cinema" dir="rtl" aria-label="مشاهد ميكانيزم تفاعلية">
  <div className="mn7-top"><span><Clapperboard size={17}/> MEDICAL MOTION STUDIO</span><small>{active+1} / {steps.length} · 2D SCIENTIFIC STORYBOARD</small></div>
  <div className="mn7-screen"><MedicalVisual context={lesson.headline+' '+current.title+' '+current.detail} sources={local.length?local:sources} step={current}/>
   <div className="mn7-screen-bottom"><span>{current.visual_focus||current.title}</span><span>{playing?'● AUTO PLAY':'Ⅱ MANUAL'}</span></div>
  </div>
  <div className="mn7-controls"><button type="button" onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'إيقاف':'تشغيل التسلسل'}</button>
   <button type="button" onClick={()=>move(active-1)} aria-label="الخطوة السابقة"><ChevronRight size={18}/></button>
   <button type="button" onClick={()=>move(active+1)} aria-label="الخطوة التالية"><ChevronLeft size={18}/></button>
   <button type="button" onClick={()=>{setActive(0);setPlaying(false)}} aria-label="إعادة من البداية"><RotateCcw size={16}/></button>
   <div className="mn7-speed">{([.5,1,2] as const).map(v=><button type="button" key={v} aria-pressed={v===speed} onClick={()=>setSpeed(v)}>{v}×</button>)}</div>
  </div>
  <div className="mn7-progress">{steps.map((s,i)=><button type="button" aria-label={'شغلي '+s.title} aria-pressed={i===active} key={i} onClick={()=>move(i)}><span/></button>)}</div>
  <div className="mn7-narrative"><strong>{current.title}</strong><p>{current.detail}</p>{current.motion&&<small>الحركة: {current.motion}</small>}</div>
  <p className="mn7-disclaimer">عرض تعليمي متحرك ببرمجيات مجانية؛ لا يمثل فيديو مولدًا أو محاكاة فسيولوجية مُتحققًا من دقتها آليًا.</p>
 </section>;
}
