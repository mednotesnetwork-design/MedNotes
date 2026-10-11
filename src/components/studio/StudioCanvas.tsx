import {useEffect,useState} from 'react';
import {clinicalConceptKey,findSharedMedia,type SharedMedia} from '../../lib/shared-learning';
import {ArrowLeft,ArrowRight,BookOpen,Check,UploadCloud,Library,ChevronLeft,ChevronRight,FileSearch,Layers,Sparkles} from 'lucide-react';
import {TeachingStage} from './TeachingStage';
import type {StudioRecord,Source} from './studio-types';

function SourcesShelf({sources}:{sources:Source[]}){
 return <div className="mn4-source-shelf">{sources.map(page=><details key={page.id}><summary><span>PAGE {page.page}</span>{page.title}</summary>{page.image&&<img src={page.image} loading="lazy" alt={'الشريحة الأصلية '+page.page}/>}<p dir="auto">{page.text}</p>{page.observations?.map((o,i)=><p key={i}>{o.text}</p>)}{page.warnings.map((w,i)=><small key={i}>{w}</small>)}</details>)}</div>;
}
export function StudioCanvas({record,busy,onNew,onLibrary,onGo,onResume,onGenerate,onRegenerate,onSimulate}:{record:StudioRecord;busy:boolean;onNew:()=>void;onLibrary:()=>void;onGo:(index:number)=>void;onResume:()=>void;onGenerate:()=>void;onRegenerate:()=>void;onSimulate:()=>void}){
 const [sourceOpen,setSourceOpen]=useState(false),[navOpen,setNavOpen]=useState(false);
 const [sharedMedia,setSharedMedia]=useState<SharedMedia[]>([]);
 const outline=record.outline,chapters=outline?.chapters||[],index=record.selected;
 const chapter=chapters[index],lesson=record.chapters[index],srcIds=new Set(chapter?.source_ids||[]);
 const sources=record.sources.filter(p=>srcIds.has(p.id));
 const conceptKey=clinicalConceptKey(chapter?.title||'')||clinicalConceptKey(lesson?.clinical?.title||'');
 useEffect(()=>{let live=true;setSharedMedia([]);if(conceptKey){
  void findSharedMedia(conceptKey).then(result=>{if(live)setSharedMedia(result)});
 }return()=>{live=false};},[conceptKey]);
 return <div className="mn3-workspace mn4-workspace" dir="rtl">
  <aside className={'mn3-chapter-nav mn4-chapters '+(navOpen?'mn4-nav-open':'')}>
   <div className="mn3-nav-title"><span>LEARNING PATH</span><h2>{outline?.title||record.name.replace(/\.pdf$/i,'')}</h2><p>{record.sources.length} صفحة في المحاضرة الأصلية</p></div>
   <div className="mn3-lecture-actions" aria-label="أدوات المحاضرات"><button onClick={onLibrary} type="button"><Library size={16}/> محاضراتي</button><button disabled={busy} type="button" onClick={onNew}><UploadCloud size={16}/> رفع محاضرة</button></div>
   <div className="mn3-navigation-caption">المفاهيم الأساسية {chapters.length?'· '+chapters.length:''}</div>
   <nav aria-label="محاور المحاضرة">{chapters.map((x,i)=><button key={i} className={'mn3-chapter-link '+(i===index?'active':'')} onClick={()=>{setNavOpen(false);setSourceOpen(false);onGo(i)}} aria-current={i===index?'step':undefined}><span>{String(i+1).padStart(2,'0')}</span><strong>{x.title}</strong>{record.chapters[i]&&<Check size={14}/>}</button>)}</nav>
   {!chapters.length&&<p className="mn3-nav-placeholder">تظهر المفاهيم هنا بمجرد اكتمال تنظيم المحاضرة.</p>}
  </aside>
  <section className="mn3-study-col mn4-primary-column">
   <div className="mn4-location"><span title={record.name}>{record.name.replace(/\.pdf$/i,'')}</span><button className="mn4-mobile-nav" type="button" onClick={()=>setNavOpen(v=>!v)}><Layers size={17}/> مسار التعلم</button></div>
   {!chapter?<div className="mn3-unbuilt"><Layers size={46}/><span>LECTURE UNDERSTANDING</span><h2>يجري تنظيم المحاضرة إلى مفاهيم</h2><p>نُرتب الأفكار حسب متطلبات الفهم، مع الاحتفاظ بكل صفحة من المصدر الأصلي.</p>{!busy&&<button className="mn3-primary" onClick={onResume}>استكمال بناء المحاضرة <ArrowLeft size={16}/></button>}</div>:
   <><header className="mn4-chapter-heading"><div><span className="mn3-overline">CONCEPT {String(index+1).padStart(2,'0')} / {String(chapters.length).padStart(2,'0')}</span><h1>{chapter.title}</h1><p>{chapter.goal}</p></div></header>
    {!lesson?<div className="mn3-not-ready"><Sparkles size={37}/><h3>هذا المفهوم جاهز لبناء الدرس</h3><p>سيبدأ الدرس من الأساسيات ويُدخل الرسوم، والشرح السببي، والأسئلة في مواضعها التعليمية.</p><button disabled={busy} className="mn3-primary" onClick={onGenerate}><Sparkles size={17}/> إنشاء هذا الدرس</button></div>:
     <><TeachingStage key={record.id+'-'+index} lesson={lesson} sources={sources} clinicalFilm={record.simulations?.[index]} busy={busy} onSimulate={onSimulate} media={sharedMedia}/>{(!lesson.module||!lesson.learning_layers||!lesson.clinical_trust)&&<div className="mn4-upgrade-lesson"><p>هذا الدرس محفوظ بالمحرك السابق. تحديثه سيعيد إنشاء الخطوات وتركيز الحركة بصريًا من المحاضرة الأصلية.</p><button disabled={busy} onClick={onRegenerate}><Sparkles size={17}/> إعادة بناء هذا المفهوم بمحرك MedNote Core AI</button></div>}</>}
    <footer className="mn4-chapter-footer"><button disabled={index===0||busy} onClick={()=>{setSourceOpen(false);onGo(index-1)}}><ArrowRight size={16}/> المفهوم السابق</button><button onClick={()=>setSourceOpen(v=>!v)}><FileSearch size={17}/> المحاضرة الأصلية</button><button disabled={index===chapters.length-1||busy} onClick={()=>{setSourceOpen(false);onGo(index+1)}}>المفهوم التالي <ArrowLeft size={16}/></button></footer>
    {sourceOpen&&<SourcesShelf sources={sources}/>}
   </>}
  </section>
 </div>;
}