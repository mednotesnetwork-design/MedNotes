import {useEffect,useState} from 'react';
import {Activity,ChevronLeft,ChevronRight,Pause,Play,RotateCcw} from 'lucide-react';
import type {TeachingChapter} from './studio-types';

export function MechanismTheatre({lesson}:{lesson:TeachingChapter}){
 const [step,setStep]=useState(0),[play,setPlay]=useState(false);
 const frames=lesson.mechanism||[];
 useEffect(()=>{setStep(0);setPlay(false);},[lesson]);
 useEffect(()=>{if(!play||frames.length<2)return;const t=setInterval(()=>setStep(n=>(n+1)%frames.length),4800);return()=>clearInterval(t);},[play,frames.length]);
 if(!frames.length)return <div className="mn3-empty"><Activity/><p>لا توجد آلية متسلسلة مدعومة بالمصدر في هذا الفصل.</p></div>;
 const current=frames[Math.min(step,frames.length-1)];
 return <section className="mn3-theatre">
  <div className="mn3-panel-head"><span><Activity size={18}/> MECHANISM EXPLORER</span><small>مخطط تفاعلي وليس فيديو مولّدًا</small></div>
  <div className="mn3-theatre-scene">
   <div className="mn3-orbit"><div className="mn3-orbit-inner">{String(step+1).padStart(2,'0')}</div><small>STEP {step+1} OF {frames.length}</small></div>
   <div className="mn3-stage-text"><span>PROCESS</span><h3>{current.title}</h3><p>{current.detail}</p></div>
  </div>
  <div className="mn3-controls"><button onClick={()=>setPlay(v=>!v)}>{play?<Pause size={16}/>:<Play size={16}/>} {play?'إيقاف':'تشغيل الخطوات'}</button><button onClick={()=>{setPlay(false);setStep(0);}}><RotateCcw size={16}/> إعادة</button><button disabled={!step} onClick={()=>{setPlay(false);setStep(n=>n-1);}}><ChevronRight size={16}/></button><span>{step+1} / {frames.length}</span><button disabled={step===frames.length-1} onClick={()=>{setPlay(false);setStep(n=>n+1);}}><ChevronLeft size={16}/></button></div>
 </section>;
}
