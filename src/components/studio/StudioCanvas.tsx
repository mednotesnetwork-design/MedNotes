import {useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,UploadCloud,Library,ChevronLeft,ChevronRight,ClipboardCheck,FileSearch,FlaskConical,Layers,Lightbulb,Play,ShieldCheck,Sparkles,Stethoscope,VideoOff} from 'lucide-react';
import {ClinicalPanel,QuizPanel} from './ClinicalPanels';
import {MechanismTheatre} from './MechanismTheatre';
import type {StudioRecord,Source} from './studio-types';

type Tab='learn'|'mechanism'|'clinical'|'quiz'|'sources';
function OriginalSources({sources}:{sources:Source[]}){
 return <div className="mn3-source-list">{sources.map(page=><details key={page.id}><summary><span>PAGE {String(page.page).padStart(2,'0')}</span>{page.title}</summary>{page.image&&<img src={page.image} loading="lazy" alt={'المحاضرة الأصلية، صفحة '+page.page}/>}<p dir="auto">{page.text}</p>{page.observations?.map((o,i)=><p key={i}><strong>{o.kind} · </strong>{o.text}</p>)}{page.warnings.map((s,i)=><small key={i}>{s}</small>)}</details>)}</div>;
}
export function StudioCanvas({record,busy,onNew,onLibrary,onGo,onResume,onGenerate}:{record:StudioRecord;busy:boolean;onNew:()=>void;onLibrary:()=>void;onGo:(index:number)=>void;onResume:()=>void;onGenerate:()=>void}){
 const [tab,setTab]=useState<Tab>('learn'),[showSources,setShowSources]=useState(false);
 const outline=record.outline,chapters=outline?.chapters||[],index=record.selected;
 const chapter=chapters[index],lesson=record.chapters[index],srcIds=new Set(chapter?.source_ids||[]);
 const sources=record.sources.filter(p=>srcIds.has(p.id));
 const covered=Object.keys(record.chapters).length;
 return <div className="mn3-workspace">
  <aside className="mn3-chapter-nav">
   <div className="mn3-nav-title"><span>YOUR LEARNING PATH</span><h2>{outline?.title||record.name}</h2><p>{record.sources.length} صفحة أصلية</p></div>
   <div className="mn3-lecture-actions" aria-label="أدوات المحاضرات"><button type="button" onClick={onLibrary} title="محاضراتي المحفوظة"><Library size={16}/> محاضراتي</button><button type="button" onClick={onNew} disabled={busy} title="رفع محاضرة جديدة"><UploadCloud size={16}/> رفع محاضرة</button></div>
   <div className="mn3-stage-list"><div className="done"><Check size={14}/> استخراج المحاضرة</div><div className={record.stage==='extracting'?'active':record.stage==='failed'?'':'done'}><Check size={14}/> فهم الصور والجداول</div><div className={outline?'done':'active'}><Check size={14}/> تنظيم المفاهيم</div><div className={covered?'done':''}><Sparkles size={14}/> بناء الشرح التعليمي</div></div>
   <div className="mn3-navigation-caption">MAIN CONCEPTS {chapters.length?('· '+chapters.length):''}</div>
   {chapters.map((x,i)=><button key={i} className={'mn3-chapter-link '+(i===index?'active':'')} onClick={()=>{setTab('learn');onGo(i);}}><span>{String(i+1).padStart(2,'0')}</span><strong>{x.title}</strong>{record.chapters[i]?<Check size={14}/>:null}</button>)}
   {!chapters.length&&<p className="mn3-nav-placeholder">ستظهر هنا الأفكار الرئيسية بعد تحليل المحاضرة.</p>}
   <div className="mn3-sidebar-foot"><BookOpen size={16}/> المحاضرة الأصلية محفوظة كمرجع، وليست واجهة الشرح الأساسية.</div>
  </aside>
  <div className="mn3-study-col">
   <div className="mn3-breadcrumb"><span>MEDNOTE</span><ChevronLeft size={13}/><span>{record.name}</span><ChevronLeft size={13}/><b>{chapter?.title||'Lecture analysis'}</b></div>
   {!chapter?<div className="mn3-unbuilt"><Layers size={48}/><span>LECTURE UNDERSTANDING</span><h2>نبني خريطة المحاضرة من محتواها العلمي</h2><p>تُراجع الرسومات أولًا، ثم تُجمع الأفكار المتشابهة ويعاد ترتيبها لتبدأ من الأساسيات قبل التطبيقات.</p>{!busy&&<button className="mn3-primary" onClick={onResume}>استكمال بناء المحاضرة <ArrowLeft size={16}/></button>}</div>:
   <><div className="mn3-lecture-head"><div><span className="mn3-overline">SECTION {String(index+1).padStart(2,'0')} / {String(chapters.length).padStart(2,'0')} · {chapter.kind.toUpperCase()}</span><h2>{lesson?.headline||chapter.title}</h2><p>{chapter.goal}</p></div><div className="mn3-lecture-page"><span>{index+1} / {chapters.length}</span><button disabled={index===0||busy} onClick={()=>{setTab('learn');onGo(index-1);}} aria-label="السابق"><ChevronRight size={19}/></button><button disabled={index===chapters.length-1||busy} onClick={()=>{setTab('learn');onGo(index+1);}} aria-label="التالي"><ChevronLeft size={19}/></button></div></div>
    <div className="mn3-nav-tabs" role="tablist" aria-label="أنماط التعلم">
     {([['learn','الشرح الجديد',BookOpen],['mechanism','Mechanism',FlaskConical],['clinical','Clinical Case',Stethoscope],['quiz','Checkpoints',ClipboardCheck],['sources','Original Lecture',FileSearch]] as const).map(([id,label,Icon])=><button role="tab" key={id} aria-selected={tab===id} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}
    </div>
    {!lesson?<section className="mn3-not-ready"><Sparkles size={35}/><h3>سلايدات هذا المفهوم لم تُنشأ بعد</h3><p>سنبني درسًا يبدأ بالمفهوم الأساسي، ثم الآلية، والمشهد السريري عند الحاجة، ثم أسئلة التفكير، مع ربط المعلومات بمصادرها الأصلية.</p><button disabled={busy} className="mn3-primary" onClick={onGenerate}><Sparkles size={17}/> إنشاء شرح هذا المفهوم</button></section>:
     <div className="mn3-content">
      {tab==='learn'&&<div className="mn3-editorial">
       <div className="mn3-lesson-intro"><span><Sparkles size={15}/> THE BIG PICTURE</span><p>{lesson.opening}</p></div>
       <section className="mn3-foundation"><div className="mn3-section-kicker"><span>01</span> START WITH THE BASICS</div><h3>{lesson.foundation.title}</h3><p>{lesson.foundation.body}</p></section>
       {lesson.scenes.map((scene,i)=><section className="mn3-lesson-scene" key={i}><div className="mn3-section-kicker"><span>{String(i+2).padStart(2,'0')}</span> REBUILT TEACHING SLIDE</div><h3>{scene.title}</h3><p>{scene.body}</p><div className="mn3-source-foot"><ShieldCheck size={14}/> موثق من المحاضرة · {scene.source_ids.map(id=>'ص '+sources.find(s=>s.id===id)?.page).join('، ')}</div></section>)}
       {!!lesson.high_yield.length&&<section className="mn3-highyield"><span><Lightbulb size={17}/> HIGH-YIELD CLINICAL NOTES</span>{lesson.high_yield.map((s,i)=><p key={i}>{s}</p>)}</section>}
       {!!lesson.uncertainties.length&&<details className="mn3-uncertainty"><summary>نقاط لم يدعمها المصدر بشكل كافٍ</summary>{lesson.uncertainties.map((s,i)=><p key={i}>{s}</p>)}</details>}
       <div className="mn3-inline-jump"><button onClick={()=>setTab('mechanism')}><FlaskConical size={16}/> شاهدي الآلية</button><button onClick={()=>setTab('quiz')}><ClipboardCheck size={16}/> اختبري فهمك</button></div>
      </div>}
      {tab==='mechanism'&&<div className="mn3-full-tab"><div className="mn3-tab-heading"><span>MEDICAL MECHANISMS</span><h3>{lesson.visual.title||'Mechanism Explorer'}</h3><p>{lesson.visual.caption}</p></div><MechanismTheatre lesson={lesson}/>{lesson.visual.shot_prompts.length>0&&<details className="mn3-shot-list"><summary>المشاهد العلمية المقترحة لإنتاج فيديو طبي</summary>{lesson.visual.shot_prompts.map((s,i)=><p key={i}>{i+1}. {s}</p>)}</details>}</div>}
      {tab==='clinical'&&<div className="mn3-full-tab"><div className="mn3-tab-heading"><span>REAL CLINICAL REASONING</span><h3>{lesson.clinical?.title||'Clinical Simulation'}</h3><p>{lesson.clinical?.scenario||'لا تذكر المحاضرة حالة سريرية كافية لهذا الفصل.'}</p></div><ClinicalPanel lesson={lesson}/></div>}
      {tab==='quiz'&&<div className="mn3-full-tab"><div className="mn3-tab-heading"><span>TEST YOUR UNDERSTANDING</span><h3>Checkpoints & Reverse Review</h3><p>اختاري الإجابة أولًا، ثم راجعي السبب العلمي ولماذا الخيارات الأخرى غير صحيحة.</p></div><QuizPanel lesson={lesson}/></div>}
      {tab==='sources'&&<div className="mn3-full-tab"><div className="mn3-tab-heading"><span>TRACEABLE EVIDENCE</span><h3>المحاضرة الأصلية</h3><p>مرجع اختياري للتحقق من النصوص والأشكال؛ لا يتم استبداله أو حذفه.</p></div><OriginalSources sources={sources}/></div>}
     </div>}
    <div className="mn3-pager"><button disabled={index===0||busy} onClick={()=>{setTab('learn');onGo(index-1);}}><ChevronRight size={17}/> المفهوم السابق</button><span>CONCEPT {String(index+1).padStart(2,'0')} / {String(chapters.length).padStart(2,'0')}</span><button disabled={index===chapters.length-1||busy} onClick={()=>{setTab('learn');onGo(index+1);}}>المفهوم التالي <ChevronLeft size={17}/></button></div>
   </>}
  </div>
  <aside className="mn3-media-rail"><div className="mn3-rail-title"><Sparkles size={17}/> INTERACTIVE LEARNING <small>{lesson?'READY':'PREPARING'}</small></div>
   {lesson?<><section className="mn3-media-card"><div className="mn3-media-card-title"><span><Stethoscope size={16}/> Clinical Simulation</span><small>Storyboarding</small></div><ClinicalPanel lesson={lesson}/><button className="mn3-media-open" onClick={()=>setTab('clinical')}>استكشفي الحالة <ArrowLeft size={16}/></button></section><section className="mn3-media-card"><div className="mn3-media-card-title"><span><FlaskConical size={16}/> Mechanism Lab</span><small>Interactive</small></div><MechanismTheatre lesson={lesson}/><button className="mn3-media-open" onClick={()=>setTab('mechanism')}>افتحي الشرح التفاعلي <ArrowLeft size={16}/></button></section><section className="mn3-media-card mn3-media-summary"><span><ClipboardCheck size={16}/> Checkpoint</span><strong>{lesson.quiz.length} أسئلة تدريبية</strong><button className="mn3-media-open" onClick={()=>setTab('quiz')}>ابدئي التدريب <ArrowLeft size={16}/></button></section></>:
   <div className="mn3-media-placeholder"><Play size={28}/><strong>الوسائط التعليمية قيد الإنشاء</strong><p>ستظهر هنا المشاهد والآليات بعد مراجعة المصدر.</p></div>}
   <button className="mn3-source-toggle" onClick={()=>setShowSources(x=>!x)}><FileSearch size={16}/>{showSources?'إخفاء المرجع':'العودة إلى المحاضرة الأصلية'} <ArrowLeft size={16}/></button>{showSources&&<OriginalSources sources={sources}/>}
   <div className="mn3-rail-disclosure"><VideoOff size={16}/><p>المحاكاة الحالية تفاعلية ونصية، ولا تُعرض على أنها فيديو حقيقي أو 3D مولّد.</p></div>
  </aside>
 </div>;
}
