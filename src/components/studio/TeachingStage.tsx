import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,ChevronLeft,ChevronRight,CheckCircle2,ClipboardCheck,FileSearch,FlaskConical,GraduationCap,Lightbulb,Play,RotateCcw,Stethoscope,Volume2} from 'lucide-react';
import type {TeachingChapter,Source} from './studio-types';
import {MedicalVisual} from './MedicalVisual';
import {QuizPanel} from './ClinicalPanels';

export type SceneView={kind:'foundation'|'concept'|'mechanism'|'clinical'|'quiz';title:string;body:string;source_ids:string[];section:string;index:number};
function clinicalIsGenuine(c:TeachingChapter['clinical']){
 if(!c||!c.shots?.length)return false;
 const text=[c.title,c.scenario,...c.shots.map(s=>s.description)].join(' ');
 if(/تخيلية|افتراضي.*مختبر|مخطط|تمثيل.*جزيئ|حركة.*حويصل|رسم.*توضيح|laboratory.*diagram|molecular diagram/i.test(text))return false;
 return /patient|مريض|مريضة|طفل|شخص|سيدة|رجل|clinical presentation|الأعراض|symptoms|pain|rash|swelling|fever|ضعف|شلل|ألم|تورم|حمى|طفح|خدر|ضيق التنفس|اختناق/i.test(text);
}
function pagesLabel(ids:string[],sources:Source[]){
 const pageNos=ids.map(id=>sources.find(s=>s.id===id)?.page).filter((n):n is number=>Number.isInteger(n));
 return [...new Set(pageNos)].sort((a,b)=>a-b).join('، ');
}
export function sceneList(lesson:TeachingChapter):SceneView[]{
 const scenes:SceneView[]=[{kind:'foundation',title:lesson.foundation.title,body:lesson.foundation.body,source_ids:lesson.source_registry.map(x=>x.id),section:'ابدئي من الأساسيات',index:0}];
 lesson.scenes.forEach((item,i)=>scenes.push({kind:'concept',title:item.title,body:item.body,source_ids:item.source_ids,section:'فهم الفكرة',index:i}));
 lesson.mechanism.forEach((item,i)=>scenes.push({kind:'mechanism',title:item.title,body:item.detail,source_ids:item.source_ids,section:'كيف تحدث الآلية؟',index:i}));
 if(clinicalIsGenuine(lesson.clinical))scenes.push({kind:'clinical',title:lesson.clinical!.title,body:lesson.clinical!.scenario,source_ids:lesson.clinical!.source_ids,section:'من المختبر إلى المريض',index:0});
 if(lesson.quiz?.length)scenes.push({kind:'quiz',title:'تأكدي من فهمك',body:'فكري بالإجابة قبل فتح التفسير، ثم راجعي لماذا بقية الخيارات غير صحيحة.',source_ids:[],section:'تطبيق وتفكير',index:0});
 return scenes;
}
function ClinicalEncounter({lesson}:{lesson:TeachingChapter}){
 const c=lesson.clinical;
 const [shot,setShot]=useState(0);
 useEffect(()=>setShot(0),[lesson]);
 if(!c||!clinicalIsGenuine(c))return null;
 const current=c.shots[shot];
 return <div className="mn4-case">
  <div className="mn4-case-heading"><Stethoscope size={18}/><span>CLINICAL CASE</span><small>حالة تعليمية افتراضية</small></div>
  <div className="mn4-case-main">
   <div className="mn4-case-moment"><span>SCENE {String(shot+1).padStart(2,'0')} / {c.shots.length}</span><h3>{current.clinical_cue}</h3><p>{current.description}</p></div>
   <div className="mn4-case-order">{c.shots.map((s,i)=><button key={i} title={s.clinical_cue} aria-current={i===shot?'step':undefined} onClick={()=>setShot(i)}>{String(i+1).padStart(2,'0')}</button>)}</div>
  </div>
  <details className="mn4-case-reveal"><summary>لماذا ظهرت هذه العلامات؟ <ArrowLeft size={16}/></summary><p>{c.reasoning}</p></details>
 </div>;
}
export function TeachingStage({lesson,sources,onExit}:{lesson:TeachingChapter;sources:Source[];onExit?:()=>void}){
 const all=useMemo(()=>sceneList(lesson),[lesson]);
 const [frame,setFrame]=useState(0),[showFull,setShowFull]=useState(false),[sourceOpen,setSourceOpen]=useState(false);
 useEffect(()=>{setFrame(0);setShowFull(false);setSourceOpen(false)},[lesson]);
 const item=all[Math.min(frame,all.length-1)];
 const sourceItems=sourceOpen?(item.source_ids.length?sources.filter(s=>item.source_ids.includes(s.id)):sources):[];
 const chunk=item.body.split(/(?<=[.!؟؛])\s+/u).map(s=>s.trim()).filter(Boolean);
 const shouldChunk=chunk.length>2&&item.body.length>230;
 return <div className="mn4-stage" dir="rtl">
  <div className="mn4-stage-label"><span><GraduationCap size={17}/> TEACHING STUDIO</span><span className="mn4-scene-count">{String(frame+1).padStart(2,'0')} <span>/</span> {String(all.length).padStart(2,'0')}</span></div>
  <div className="mn4-progress">{all.map((s,i)=><button key={i} title={s.title} aria-label={'افتحي '+s.title} className={i===frame?'current':i<frame?'past':''} onClick={()=>{setFrame(i);setShowFull(false);setSourceOpen(false)}}/>)}</div>
  <div className="mn4-scene-heading"><span>{item.section}</span><h2>{item.title}</h2></div>
  {item.kind==='quiz'?<QuizPanel lesson={lesson}/>:
  <>
   <MedicalVisual context={item.title+' '+item.body} sources={item.source_ids.length?sources.filter(p=>item.source_ids.includes(p.id)):sources}/>
   {item.kind==='clinical'?<ClinicalEncounter lesson={lesson}/>:null}
   <div className="mn4-teaching-copy">
    <div className="mn4-copy-title"><BookOpen size={16}/><span>الفكرة الأساسية</span></div>
    {shouldChunk&&!showFull?<><p>{chunk.slice(0,2).join(' ')}</p><button className="mn4-expand" onClick={()=>setShowFull(true)}>تابعي الشرح <ChevronLeft size={16}/></button></>:<p>{item.body}</p>}
   </div>
   {item.kind==='mechanism'&&<div className="mn4-mech-context"><FlaskConical size={17}/><p>تتبعي الخطوات بالتنقل؛ يتغير الشرح مع كل مرحلة، بينما يظل التمثيل البصري مرجعًا للعملية.</p></div>}
   {item.kind==='foundation'&&lesson.opening&&<div className="mn4-think"><Lightbulb size={18}/><p>{lesson.opening}</p></div>}
  </>}
  {!!item.source_ids.length&&<button type="button" className="mn4-source-trigger" onClick={()=>setSourceOpen(v=>!v)}><FileSearch size={16}/>{sourceOpen?'إخفاء المرجع':'التحقق من المصدر'} <span>صفحات {pagesLabel(item.source_ids,sources)||'المحاضرة'}</span></button>}
  {sourceOpen&&<div className="mn4-source-drawer">{sourceItems.map(s=><details key={s.id}><summary>الشريحة الأصلية {s.page} — {s.title}</summary>{s.image&&<img src={s.image} alt={'الشريحة الأصلية '+s.page} loading="lazy"/>}<p>{s.text}</p>{s.warnings.map((x,i)=><small key={i}>{x}</small>)}</details>)}</div>}
  <div className="mn4-stage-footer"><button className="mn4-secondary" disabled={frame===0} onClick={()=>{setFrame(v=>v-1);setSourceOpen(false);setShowFull(false)}}><ArrowRight size={19}/> السابق</button><span>{Math.round((frame+1)/all.length*100)}% من هذا المفهوم</span>{frame===all.length-1?<button className="mn4-primary" onClick={()=>{setFrame(0);onExit?.()}}><RotateCcw size={17}/> مراجعة أخرى</button>:<button className="mn4-primary" onClick={()=>{setFrame(v=>v+1);setSourceOpen(false);setShowFull(false)}}>تابعي <ArrowLeft size={19}/></button>}</div>
 </div>;
}