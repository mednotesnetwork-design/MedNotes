import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,ChevronLeft,ChevronRight,CheckCircle2,ClipboardCheck,FileSearch,FlaskConical,GraduationCap,Lightbulb,Play,RotateCcw,Stethoscope,Volume2} from 'lucide-react';
import type {TeachingChapter,Source,ClinicalFilm} from './studio-types';
import {ClinicalFilmStage} from './ClinicalFilmStage';
import {MedicalVisual} from './MedicalVisual';
import {QuizPanel} from './ClinicalPanels';

export type SceneView={kind:'foundation'|'anatomy'|'concept'|'mechanism-overview'|'mechanism'|'clinical-overview'|'clinical'|'quiz';title:string;body:string;source_ids:string[];section:string;index:number};
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
 const layers=lesson.learning_layers;
 const scenes:SceneView[]=[];
 const pushLayer=(kind:SceneView['kind'],key:'foundation'|'anatomy'|'mechanism'|'clinical',section:string)=>{
  const v=layers?.[key];
  if(v?.coverage==='supported')scenes.push({kind,title:v.title,body:v.explanation,source_ids:v.source_ids,section,index:0});
 };
 if(layers){
  pushLayer('foundation','foundation','الطبقة 1 · من الصفر');
  pushLayer('anatomy','anatomy','الطبقة 2 · التركيب والاتجاه');
 }else{
  scenes.push({kind:'foundation',title:lesson.foundation.title,body:lesson.foundation.body,source_ids:lesson.source_registry.map(x=>x.id),section:'الطبقة 1 · من الصفر',index:0});
 }
 lesson.scenes.forEach((item,i)=>scenes.push({kind:'concept',title:item.title,body:item.body,source_ids:item.source_ids,section:'فهم التفاصيل',index:i}));
 if(layers)pushLayer('mechanism-overview','mechanism','الطبقة 3 · آلية العمل');
 lesson.mechanism.forEach((item,i)=>scenes.push({kind:'mechanism',title:item.title,body:item.detail,source_ids:item.source_ids,section:'الطبقة 3 · الخطوة '+(i+1)+' من '+lesson.mechanism.length,index:i}));
 if(layers)pushLayer('clinical-overview','clinical','الطبقة 4 · الأهمية السريرية');
 if(clinicalIsGenuine(lesson.clinical))scenes.push({kind:'clinical',title:lesson.clinical!.title,body:lesson.clinical!.scenario,source_ids:lesson.clinical!.source_ids,section:'من الفسيولوجيا إلى المريض',index:0});
 if(lesson.quiz?.length)scenes.push({kind:'quiz',title:'تأكدي من فهمك',body:'فكري بالإجابة قبل فتح التفسير، ثم راجعي لماذا بقية الخيارات غير صحيحة.',source_ids:[],section:'تطبيق وتفكير',index:0});
 return scenes.length?scenes:[{kind:'foundation',title:lesson.foundation.title,body:lesson.foundation.body,source_ids:lesson.source_registry.map(x=>x.id),section:'الأساسيات',index:0}];
}

export function TeachingStage({lesson,sources,clinicalFilm,busy=false,onSimulate,onExit}:{lesson:TeachingChapter;sources:Source[];clinicalFilm?:ClinicalFilm;busy?:boolean;onSimulate?:()=>void;onExit?:()=>void}){
 const all=useMemo(()=>sceneList(lesson),[lesson]);
 const [frame,setFrame]=useState(0),[showFull,setShowFull]=useState(false),[sourceOpen,setSourceOpen]=useState(false);
 useEffect(()=>{setFrame(0);setShowFull(false);setSourceOpen(false)},[lesson]);
 const item=all[Math.min(frame,all.length-1)];
 const sourceItems=sourceOpen?(item.source_ids.length?sources.filter(s=>item.source_ids.includes(s.id)):sources):[];
 const chunk=item.body.split(/(?<=[.!؟؛])\s+/u).map(s=>s.trim()).filter(Boolean);
 const shouldChunk=chunk.length>2&&item.body.length>230;
 return <div className="mn4-stage" dir="rtl">
  <div className="mn4-stage-label"><span><GraduationCap size={17}/> TEACHING STUDIO</span><span className="mn4-scene-count">{String(frame+1).padStart(2,'0')} <span>/</span> {String(all.length).padStart(2,'0')}</span></div>
  {lesson.clinical_trust&&<div className="mn4-evidence-banner" role="status"><span>{lesson.clinical_trust.clinical_approval?'تم تسجيل مراجعة طبية بشرية':'محتوى تعليمي · بانتظار مراجعة طبية بشرية'}</span><small>{lesson.clinical_trust.external_reference_status==='retrieved'?'مراجع خارجية موثقة متاحة':'التحقق بالمراجع الخارجية غير متاح أو لم يجد نتيجة'} · تدقيق المصدر آلي</small></div>}
  <div className="mn4-progress">{all.map((s,i)=><button key={i} title={s.title} aria-label={'افتحي '+s.title} className={i===frame?'current':i<frame?'past':''} onClick={()=>{setFrame(i);setShowFull(false);setSourceOpen(false)}}/>)}</div>
  <div className="mn4-scene-heading"><span>{item.section}</span><h2>{item.title}</h2></div>
  {item.kind==='quiz'?<QuizPanel lesson={lesson}/>:
  <>
   {item.kind!=='clinical'&&<MedicalVisual context={item.title+' '+item.body} sources={item.source_ids.length?sources.filter(p=>item.source_ids.includes(p.id)):sources} step={item.kind==='mechanism'?lesson.mechanism[item.index]:undefined}/>}
   {item.kind==='clinical'&&(clinicalFilm?<ClinicalFilmStage film={clinicalFilm}/>:<section className="mn5-prepare"><span>CLINICAL SIMULATION DIRECTOR</span><h3>إنتاج سيناريو تصوير طبي لهذا المفهوم</h3><p>سيتحقق المحرك من أعراض الحالة في صفحات محاضرتك، ثم ينشئ أربع مراحل تصويرية مع توجيه الكاميرا ومؤشرات حيوية موثقة، ويُراجع المحتوى قبل عرضه. لا يتم إنشاء فيديو فعلي في هذه المرحلة.</p><button type="button" disabled={busy||!onSimulate} onClick={onSimulate}>{busy?'تجري المعالجة…':'إنشاء سيناريو المحاكاة السريرية'}</button></section>)}
   {item.kind!=='clinical'&&<div className="mn4-teaching-copy">
    <div className="mn4-copy-title"><BookOpen size={16}/><span>الفكرة الأساسية</span></div>
    {shouldChunk&&!showFull?<><p>{chunk.slice(0,2).join(' ')}</p><button className="mn4-expand" onClick={()=>setShowFull(true)}>تابعي الشرح <ChevronLeft size={16}/></button></>:<p>{item.body}</p>}
   </div>}
   {item.kind==='mechanism'&&<div className="mn4-mech-context"><FlaskConical size={17}/><p>Micro-step {item.index+1} / {lesson.mechanism.length} · تابعي التركيب المميز بصريًا، والحركة الناتجة، ثم انتقلي للخطوة التالية بالترتيب السببي.</p></div>}
   {item.kind==='foundation'&&lesson.opening&&<div className="mn4-think"><Lightbulb size={18}/><p>{lesson.opening}</p></div>}
   {item.kind==='clinical-overview'&&lesson.high_yield?.length>0&&<section className="mn4-clinical-pearls"><strong>Clinical Pearls · أهم النقاط الطبية</strong>{lesson.high_yield.map((pearl,i)=><p key={i}>{pearl}</p>)}</section>}
  </>}
  {!!item.source_ids.length&&<button type="button" className="mn4-source-trigger" onClick={()=>setSourceOpen(v=>!v)}><FileSearch size={16}/>{sourceOpen?'إخفاء المرجع':'التحقق من المصدر'} <span>صفحات {pagesLabel(item.source_ids,sources)||'المحاضرة'}</span></button>}
  {sourceOpen&&<div className="mn4-source-drawer">{sourceItems.map(s=><details key={s.id}><summary>الشريحة الأصلية {s.page} — {s.title}</summary>{s.image&&<img src={s.image} alt={'الشريحة الأصلية '+s.page} loading="lazy"/>}<p>{s.text}</p>{s.warnings.map((x,i)=><small key={i}>{x}</small>)}</details>)}</div>}
  <div className="mn4-stage-footer"><button className="mn4-secondary" disabled={frame===0} onClick={()=>{setFrame(v=>v-1);setSourceOpen(false);setShowFull(false)}}><ArrowRight size={19}/> السابق</button><span>{Math.round((frame+1)/all.length*100)}% من هذا المفهوم</span>{frame===all.length-1?<button className="mn4-primary" onClick={()=>{setFrame(0);onExit?.()}}><RotateCcw size={17}/> مراجعة أخرى</button>:<button className="mn4-primary" onClick={()=>{setFrame(v=>v+1);setSourceOpen(false);setShowFull(false)}}>تابعي <ArrowLeft size={19}/></button>}</div>
 </div>;
}