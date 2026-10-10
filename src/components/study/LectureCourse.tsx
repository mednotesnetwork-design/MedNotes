import {useEffect,useRef,useState,type TouchEvent,type KeyboardEvent} from 'react';
import {pdfjs} from 'react-pdf';
import {BookOpen,Upload,ChevronLeft,ChevronRight,Sparkles} from 'lucide-react';
import {studyRequest,saveLectureRecord,loadActiveLecture,listSavedLectures,loadSavedLecture,saveLectureOriginal,loadLectureOriginal,
 type SavedLectureMeta} from '../../lib/study-store';
import {extractTextPoints,buildFastSourcePlan} from '../../lib/lecture-fast';
import {appendLecturePage,createLectureJob,getLectureJob,startLectureJob,type LectureJobHandle} from '../../lib/lecture-jobs';
import {LessonJourney,type LearningTab} from './LessonJourney';
import {ClinicalTeachingLayers} from './ClinicalTeachingLayers';
import {MedicalAtlasLayouts} from './MedicalAtlasLayouts';
import type {Explanation} from './types';
import {type MainConcept,validateConceptGrouping,conceptBranches,conceptCards,conceptSourceIds,
 findConceptIndex,provisionalConcepts} from '../../lib/lecture-concepts';

type Point={id:string;page:number;kind:string;text:string;origin:string;item_id?:string;page_number?:number;content_type?:string;source_ref?:string;bbox?:number[]};
type SourcePage={number:number;text:string;image?:string;title?:string;points?:Point[];warnings?:string[]};
type Card={id:string;title:string;source_ids:string[]};
type Unit={id:string;title:string;objective:string;cards:Card[]};
type Plan={title:string;units:Unit[]};
type Turn={question:string;lesson:Explanation};
type StudyTab=LearningTab|'notes';
type Stage='queued'|'extracting'|'structuring'|'generating'|'validating'|'retrying'|'failed'|'ready';
type Course={id?:string;name:string;pages:SourcePage[];plan?:Plan;concepts?:MainConcept[];semanticClustering?:boolean;activeConcept?:number;conceptOverviews?:Record<string,Explanation>;remote?:LectureJobHandle;remoteProgress?:string;planning?:{next:number;units:Unit[]};planningNotices?:string[];phase?:Stage;active:number;mode:string;lessons:Record<string,Explanation>;turns:Record<string,Turn[]>;answers:Record<string,number>;notes?:Record<string,string>};
const empty:Course={name:'',pages:[],active:0,mode:'lecture_only',phase:'queued',lessons:{},turns:{},answers:{}};
const STORE='lecture-course-v2';
function jpeg(canvas:HTMLCanvasElement){
 let result=canvas.toDataURL('image/jpeg',.87);
 if(result.length>650000)result=canvas.toDataURL('image/jpeg',.68);
 if(result.length>2700000)throw new Error('تحتاج هذه الصفحة إلى صورة أصغر أو أوضح. لم يتم تجاهلها.');
 return result;
}
function Progress({message,cancel}:{message:string;cancel:()=>void}){
 const [seconds,setSeconds]=useState(0);
 useEffect(()=>{const start=Date.now();const t=setInterval(()=>setSeconds(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(t);},[message]);
 return <div className="course-progress" role="status"><Sparkles size={20}/><span>{message}<small>{seconds} ثانية · يُحفظ التقدم بعد كل خطوة</small></span><button onClick={cancel}>إيقاف</button></div>;
}
export function LectureCourse(){
 const [course,setCourse]=useState<Course>(empty),[ready,setReady]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [question,setQuestion]=useState(''),[pasted,setPasted]=useState(''),[sources,setSources]=useState(false);
 const [library,setLibrary]=useState<SavedLectureMeta[]>([]),[libraryOpen,setLibraryOpen]=useState(false);
 const [studyTab,setStudyTab]=useState<StudyTab>('explain'),[slideDirection,setSlideDirection]=useState<'next'|'prev'>('next');
 const gesture=useRef<{x:number;y:number}|null>(null),trackRef=useRef<HTMLDivElement>(null);
 const current=useRef(course),control=useRef<AbortController|null>(null),fileInput=useRef<HTMLInputElement>(null),lastRequest=useRef(0);
 function update(value:Course){current.current=value;setCourse(value);}
 async function save(value:Course){
  const saved=await saveLectureRecord(value);
  update(saved);
 }
 useEffect(()=>{
  let live=true;
  void Promise.all([loadActiveLecture<Course>(),listSavedLectures()]).then(([saved,entries])=>{
   if(!live)return;
   if(saved){current.current=saved;setCourse(saved);}
   setLibrary(entries);setReady(true);
  }).catch(()=>{if(live){setError('تعذر فتح مكتبة المحاضرات في هذا المتصفح. تحققي من مساحة التخزين وخصوصية Safari.');setReady(true);}});
  return()=>{live=false;control.current?.abort();};
 },[]);
 async function switchLecture(id:string){
  if(control.current){setError('أوقفي المعالجة الحالية قبل الانتقال لمحاضرة أخرى.');return;}
  try{
   const saved=await loadSavedLecture<Course>(id);
   if(!saved)throw new Error('لم نعثر على نسخة المحاضرة داخل هذا المتصفح.');
   update(saved);setLibraryOpen(false);setError('');setStudyTab('explain');setNotice('المحاضرة محفوظة محليًا في Safari. المزامنة عبر الأجهزة تحتاج قاعدة بيانات على الخادم.');
  }catch(e){setError(e instanceof Error?e.message:'تعذر فتح المحاضرة');}
 }
 useEffect(()=>{
  if(!ready||!course.pages.length||control.current|| (course.remote&&!course.plan))return;
  if(!course.plan||!course.concepts?.length){
   // Migrate the user's already extracted and approved 47-card lecture
   // without discarding source points, explanations, quizzes or notes.
   void work(organize);
  }
 // Run only after restoring a saved course, not after every processing checkpoint.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ready,course.plan,course.concepts]);
 useEffect(()=>{
  if(!ready||!course.remote||course.phase==='ready'||course.phase==='failed')return;
  let stopped=false;
  const sync=async()=>{
   try{
    const snapshot=await getLectureJob(course.remote!);
    if(stopped||current.current.remote?.job_id!==snapshot.job_id)return;
    const previous=current.current;
    const merged:Course={...previous,phase:snapshot.phase,
      plan:snapshot.plan as Plan|undefined||previous.plan,
      lessons:{...previous.lessons,...snapshot.lessons as Record<string,Explanation>},
      remoteProgress:`${snapshot.processed_pages} / ${snapshot.total_pages} صفحات · ${snapshot.plan_offset} نقاط منظمة · محاولة ${snapshot.attempts}`,
      pages:previous.pages.map(page=>{
       const found=snapshot.pages?.find(p=>p.number===page.number);
       return found?{...page,points:found.points as Point[],warnings:found.warnings}:page;
      })};
    if(snapshot.phase==='failed')setError(`فشلت المعالجة الخلفية: ${snapshot.error_code||'غير معروف'}. الصفحات محفوظة على الخادم.`);
    await save(merged);
   }catch(e){
    if(!stopped&&e instanceof Error)setError('تعذر تحديث حالة المهمة الخلفية: '+e.message);
   }
  };
  void sync();const timer=setInterval(()=>void sync(),6000);
  return()=>{stopped=true;clearInterval(timer);};
 // Poll every phase transition; leave in-flight work in Vercel Queues.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ready,course.remote?.job_id,course.phase]);
 async function request(body:unknown,signal:AbortSignal){
  // Only the current read-only AI call is retried; saved PDF and teaching
  // checkpoints are never cleared or silently marked complete.
  const wait=async(ms:number)=>{
   if(ms<=0)return;
   await new Promise<void>((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'));};
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
    signal.addEventListener('abort',abort,{once:true});
   });
  };
  for(let attempt=0;attempt<3;attempt++){
   await wait(Math.max(0,11000-(Date.now()-lastRequest.current)));
   signal.throwIfAborted();lastRequest.current=Date.now();
   try{return await studyRequest('lecture',body,signal);}
   catch(err){
    const code=(err as Error&{code?:string}).code;
    if(attempt===2||!['PROVIDER_FAILURE','PROVIDER_BUSY','STUDY_TIMEOUT'].includes(code||''))throw err;
    setBusy(`Gemini أرسل ردًا غير مكتمل؛ إعادة محاولة ${attempt+1} من 2 دون فقد التقدم…`);
    await wait(900*(2**attempt)+Math.floor(Math.random()*450));
   }
  }
  throw new Error('تعذرت معالجة الطلب الحالي، والمحتوى السابق محفوظ.');
 }
 async function work(task:(signal:AbortSignal)=>Promise<void>){
  if(control.current)return;const c=new AbortController();control.current=c;setError('');
  try{await task(c.signal);}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError(e instanceof Error?e.message:'تعذرت معالجة المحاضرة.');}
  finally{control.current=null;setBusy('');}
 }
 async function submitRemote(pages:SourcePage[],signal:AbortSignal){
  // Browser parses the PDF but the AI extraction, planning and teaching runs
  // independently in Vercel Queues, with state held in PostgreSQL.
  const handle=await createLectureJob(current.current.name,pages.length,signal);
  await save({...current.current,remote:handle,phase:'queued'});
  for(let i=0;i<pages.length;i++){
   signal.throwIfAborted();
   setBusy(`تحميل آمن للخادم · صفحة ${i+1} من ${pages.length}`);
   const p=pages[i];
   await appendLecturePage(handle,{number:p.number,text:p.text,image:p.image},signal);
  }
  await startLectureJob(handle,signal);
  await save({...current.current,remote:handle,phase:'queued'});
 }
 async function consolidateConcepts(signal:AbortSignal){
  const state=current.current,units=state.plan?.units||[];
  if(!units.length)throw new Error('لا توجد وحدات مستخرجة لتجميعها.');
  if(state.concepts?.length)return;
  const all=state.pages.flatMap(p=>p.points||[]);
  const byId=new Map(all.map(p=>[p.id,p]));
  const sourceUnits=units.map(u=>{
   const sample=u.cards.flatMap(c=>c.source_ids).map(id=>byId.get(id)?.text||'')
    .filter(Boolean).join(' · ').slice(0,350);
   return {id:u.id,title:u.title,objective:u.objective,sample};
  });
  setBusy(`دمج ${units.length} وحدة فرعية في مفاهيم رئيسية مترابطة…`);
  let concepts:MainConcept[],semantic=true;
  try{
   const result=await request({operation:'consolidate',title:state.name,
       total_pages:state.pages.length,units:sourceUnits},signal);
   signal.throwIfAborted();
   semantic=result.semantic_clustering===true;
   concepts=validateConceptGrouping(units,{concepts:(result.concepts as MainConcept[]).map((c,i)=>({...c,id:'concept-'+(i+1)})),
      semantic_clustering:semantic},10);
  }catch(error){
   signal.throwIfAborted();
   const code=(error as Error&{code?:string}).code;
   // Do not hide authentication/configuration failures.
   if(!['PROVIDER_FAILURE','PROVIDER_BUSY','STUDY_TIMEOUT','COURSE_CONCEPT_FAILED'].includes(code||''))throw error;
   concepts=provisionalConcepts(units,state.pages.length);
   semantic=false;
  }
  // Reject any source loss even if Gemini returned superficially valid JSON.
  const oldIDs=units.flatMap(u=>u.cards.flatMap(c=>c.source_ids));
  const groupedIDs=concepts.flatMap(c=>conceptSourceIds(c,units));
  if(oldIDs.length!==groupedIDs.length||new Set(groupedIDs).size!==new Set(oldIDs).size||
     groupedIDs.some(id=>!oldIDs.includes(id)))throw new Error('فشلت مراجعة سلامة المصادر بعد دمج المفاهيم.');
  const selectedCard=units.flatMap(u=>u.cards)[state.active];
  const activeConcept=selectedCard?findConceptIndex(concepts,units,selectedCard.id):0;
  await save({...current.current,concepts,semanticClustering:semantic,activeConcept,
     planningNotices:[...(current.current.planningNotices||[]),...(!semantic?
      ['التجميع الحالي مؤقت ويحافظ على جميع المصادر؛ لم ينجح Gemini في تصنيف المفاهيم دلاليًا.']:[])]});
 }
 async function organize(signal:AbortSignal){
  let state=current.current;
  if(state.plan){
   if(!state.concepts?.length)await consolidateConcepts(signal);
   // Each major concept gets a first-principles introduction, independently
   // reviewed by the existing source fidelity audit.
   try{await teachConceptOverview(signal);}
   catch(e){
    signal.throwIfAborted();
    await save({...current.current,planningNotices:[...(current.current.planningNotices||[]),
     'لم يكتمل التمهيد الطبي تلقائيًا؛ استخدمي زر إنشائه دون رفع المحاضرة مجددًا.']});
   }
   await save({...current.current,phase:'ready'});
   return;
  }
  // FAST PATH: text-bearing PDF pages are ingested deterministically without
  // a paid inference call per page/chunk. Images without searchable text still
  // require separate Gemini vision extraction and explicit uncertainty labels.
  if(state.phase!=='extracting'&&state.phase!=='structuring'){
   state={...state,phase:'extracting'};await save(state);
  }
  let textPages=0;
  for(let index=0;index<state.pages.length;index++){
   signal.throwIfAborted();
   const page=state.pages[index];
   if(page.points!==undefined)continue;
   if(page.text.trim().length>=80){
    const preserved:SourcePage={...page,points:extractTextPoints(page.number,page.text),
     warnings:[...(page.warnings||[]),'تم استخراج النص الأصلي مباشرة. تفاصيل الرسومات غير الممثلة في طبقة النص لم تُراجع بصريًا.']};
    state={...state,pages:state.pages.map((old,k)=>k===index?preserved:old)};
    textPages++;
    setBusy(`قراءة النص الأصلي مباشرة · الصفحة ${index+1} من ${state.pages.length}`);
    if(textPages%6===0)await save(state);
    continue;
   }
   setBusy(`فحص صفحة مصورة بدون نص قابل للنسخ · ${page.number} من ${state.pages.length}`);
   if(!page.image){
    state={...state,pages:state.pages.map((old,k)=>k===index?{...old,points:extractTextPoints(old.number,old.text),warnings:
      [...(old.warnings||[]),'تعذر استخراج الصورة والنص من الصفحة؛ يلزم فحص الأصل.']}:old)};
    await save(state);
    continue;
   }
   const extraction=await request({operation:'extract',pages:[{number:page.number,text:page.text,image:page.image}]},signal);
   signal.throwIfAborted();
   const result=(extraction.pages as SourcePage[])?.find(p=>p.number===page.number);
   if(!result)throw new Error('تعذر استلام نتيجة فحص الصفحة '+page.number);
   state={...state,pages:state.pages.map((old,k)=>k===index?{...old,...result}:old)};
   await save(state);
  }
  if(textPages%6)await save(state);
  const points=state.pages.flatMap(p=>p.points||[]);
  if(!points.length)throw new Error('لم يظهر محتوى قابل للاستخراج. راجعي الملف الأصلي.');
  setBusy('بناء خريطة المصادر دون انتظار عشرات طلبات Gemini…');
  // One source-safe local pass replaces 10–40 per-chunk curriculum requests.
  // Semantic AI then groups these exact source IDs into few major concepts.
  const fastPlan=buildFastSourcePlan(state.pages,state.name);
  state={...state,plan:fastPlan,planning:undefined,active:0,phase:'structuring',
   planningNotices:[...(state.planningNotices||[]),'تم بناء الهيكل الأساسي سريعًا من النص الموثّق. الرسومات غير المفحوصة تظهر بتنبيه ولا تُعتبر مراجَعة.']};
  await save(state);
  await consolidateConcepts(signal);
  try{await teachConceptOverview(signal);}
  catch(error){
   signal.throwIfAborted();
   await save({...current.current,planningNotices:[...(current.current.planningNotices||[]),
    'لم يكتمل التمهيد الأول تلقائيًا؛ يمكنك إنشاؤه من داخل السلايد.']});
  }
  await save({...current.current,phase:'ready'});
 }
 async function openFile(file:File){await work(async signal=>{
  if(file.size>30*1024*1024)throw new Error('الحد الأقصى للملف 30 MB.');
  setBusy('فتح المحاضرة وقراءة جميع صفحاتها…');const pages:SourcePage[]=[];
  if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
   const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
   try{if(pdf.numPages>300)throw new Error('الحد الأقصى 300 صفحة. قسّمي المحاضرة إلى ملفات.');
    for(let n=1;n<=pdf.numPages;n++){
     signal.throwIfAborted();setBusy(`فتح صفحة ${n} من ${pdf.numPages}`);const page=await pdf.getPage(n),content=await page.getTextContent();
     const text=content.items.map(x=>'str'in x?x.str+(x.hasEOL?'\n':' '):'').join('');
     if(text.length>40000)throw new Error(`الصفحة ${n} تتجاوز حد النص؛ لم يتم حذف أي جزء منها.`);
     const raw=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(2,1800/Math.max(raw.width,raw.height))});
     const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
     await page.render({canvas,viewport}).promise;pages.push({number:n,text,image:jpeg(canvas)});canvas.width=0;canvas.height=0;page.cleanup();
    }
   }finally{await pdf.destroy();}
  }else if(file.type.startsWith('image/')){
   const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.fillStyle='#fff';canvas.getContext('2d')!.fillRect(0,0,canvas.width,canvas.height);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);pages.push({number:1,text:'',image:jpeg(canvas)});}finally{bitmap.close();}
  }else if(/\.txt$/i.test(file.name)){pages.push(...textPages(await file.text()));}
  else throw new Error('اختاري PDF أو صورة أو ملف TXT.');
  signal.throwIfAborted();await save({...empty,name:file.name,pages,phase:'queued'});setSources(false);
  try{await submitRemote(pages,signal);}
  catch(e){
   // No database provisioned: retain the established local fallback and
   // show an explicit warning instead of claiming durable processing.
   const code=(e as Error & {code?:string}).code;
   if(code!=='DATABASE_NOT_CONFIGURED')throw e;
   setNotice('التخزين على الخادم غير مفعّل؛ تُحفظ المحاضرة وخطوات معالجتها في هذا المتصفح.');
   await save({...current.current,phase:'extracting'});
   await organize(signal);
  }
 });}
 function textPages(text:string){const parts=text.split(/\n\s*---\s*\n/);if(!text.trim()||parts.length>300||parts.some(t=>t.length>40000))throw new Error('النص فارغ أو يتجاوز حدود الصفحات؛ افصلي الصفحات بسطر --- .');return parts.map((text,i)=>({number:i+1,text}));}
 async function teach(signal:AbortSignal,followup=''){
  const state=current.current,all=state.plan?.units.flatMap(u=>u.cards)||[],card=all[state.active];if(!card)return;
  const key=card.id+':'+state.mode,points=state.pages.flatMap(p=>p.points||[]).filter(p=>card.source_ids.includes(p.id));
  setBusy(followup?'إعداد إجابة مرتبطة بالفكرة ومراجعتها…':'بناء سلايد الشرح مع الرسم والأسئلة ومراجعة تغطية النقاط…');
  const turns=state.turns[key]||[],base=state.lessons[key];
  const conversation=(base?[{role:'assistant',content:base.explanation}]:[]).concat(turns.flatMap(t=>[{role:'user',content:t.question},{role:'assistant',content:t.lesson.explanation}])).slice(-8);
  const data=await request({operation:'teach',title:state.name+' · '+(state.concepts?.[state.activeConcept||0]?.title||'')+' · '+card.title,points,source_mode:state.mode,question:followup,conversation,requested_tool:/اختبر|سؤال جديد|سؤال مشابه/.test(followup)?'quiz':/بصري|رسم/.test(followup)?'visual':'explain'},signal);signal.throwIfAborted();
  const lesson:Explanation={...data.lesson,id:crypto.randomUUID(),source_mode:state.mode};
  if(followup)await save({...current.current,turns:{...current.current.turns,[key]:[...turns,{question:followup,lesson}]}});
  else await save({...current.current,lessons:{...current.current.lessons,[key]:lesson}});
 }
 async function teachConceptOverview(signal:AbortSignal){
  const state=current.current,concept=state.concepts?.[state.activeConcept||0];
  if(!concept||!state.plan)return;
  const key=concept.id+':'+state.mode;
  if(state.conceptOverviews?.[key])return;
  const all=new Map(state.pages.flatMap(p=>p.points||[]).map(p=>[p.id,p]));
  const units=conceptBranches(concept,state.plan.units);
  const selections:Point[]=[];let chars=0;
  // Build an evidence-based beginner introduction using source samples from
  // DISTINCT subtopics; never falsely mark all concept facts as reviewed.
  for(const u of units){
   const candidates=u.cards.flatMap(c=>c.source_ids).map(id=>all.get(id)).filter((p):p is Point=>!!p);
   const preferred=candidates.find(p=>!/(?:\\btitle\\b|objectives|outlines|references|عنوان المحاضرة|قائمة الأهداف)/i.test(p.text))||candidates[0];
   if(!preferred||selections.some(p=>p.id===preferred.id)||selections.length>=8||
      chars+preferred.text.length>12500)continue;
   selections.push(preferred);chars+=preferred.text.length;
  }
  if(!selections.length)return;
  setBusy('إعداد تمهيد المفهوم الرئيسي من الصفر مع مراجعة مصادره…');
  const response=await request({operation:'teach',
   title:state.name+' · '+concept.title,points:selections,
   source_mode:state.mode,requested_tool:'explain',
   question:'قدمي تمهيدًا واضحًا جدًا لطالب طب يبدأ من الصفر: عرّفي الفكرة الأساسية والمصطلحات، ثم اشرحي العلاقة بين الأسباب والآليات والنتائج من النقاط المقدمة فقط، مع خريطة ذهنية للتفرعات ومثال سريري فقط إن كان مذكورًا. اتركي التفاصيل الأخرى داخل التفرعات ولا تدّعي اكتمال شرحها.'},signal);
  signal.throwIfAborted();
  const overview:Explanation={...response.lesson,id:crypto.randomUUID(),source_mode:state.mode};
  await save({...current.current,conceptOverviews:{...current.current.conceptOverviews,[key]:overview}});
 }
 async function rebuildEditorialVisual(signal:AbortSignal){
  const state=current.current,card=state.plan?.units.flatMap(u=>u.cards)[state.active];
  if(!card)return;
  const key=card.id+':'+state.mode;
  const points=state.pages.flatMap(p=>p.points||[]).filter(p=>card.source_ids.includes(p.id));
  if(!points.length)throw new Error('لا توجد نقاط مصدر موثّقة لهذه الفكرة.');
  setBusy('إعادة بناء الشرح البصري بأسلوب المرجع الطبي ومراجعة كل عنصر…');
  const response=await request({operation:'teach',
   title:state.name+' · '+(state.concepts?.[state.activeConcept||0]?.title||card.title),
   points,source_mode:state.mode,requested_tool:'visual',
   question:'قدمي مخططًا طبيًا تعليميًا مستندًا للمحاضرة بأسلوب textbook editorial: خريطة شعاعية للعلاقات المستقلة، شجرة تصنيف للتفرعات، أسهم مرقمة للآلية السببية المصرح بها، مقارنة منظمة أو طبقات عند ملاءمتها. استخدمي فقط العناصر التي تذكرها المحاضرة ولا تبتكري حقائق أو تشخيصات.'},signal);
  signal.throwIfAborted();
  const revised=response.lesson as Explanation;
  const old=current.current.lessons[key];
  // Reviewed visual fields replace only visual fields; prior explanations,
  // quizzes, corrections and student notes are retained unchanged.
  const merged:Explanation=old?{
   ...old,
   textbook_layouts:revised.textbook_layouts?.length?revised.textbook_layouts:old.textbook_layouts,
   clinical_callouts:revised.clinical_callouts?.length?revised.clinical_callouts:old.clinical_callouts,
   visual:revised.visual&&revised.visual.kind!=='none'?revised.visual:old.visual,
   clinical_layers:old.clinical_layers?{
    ...old.clinical_layers,
    visual_cues:revised.clinical_layers?.visual_cues?.length?revised.clinical_layers.visual_cues:old.clinical_layers.visual_cues
   }:revised.clinical_layers,
   source_registry:revised.source_registry||old.source_registry
  }:{...revised,id:crypto.randomUUID(),source_mode:state.mode};
  await save({...current.current,lessons:{...current.current.lessons,[key]:merged}});
 }
 async function changeConcept(index:number){
  const state=current.current,concept=state.concepts?.[index];
  if(!concept||control.current||!state.plan)return;
  const branch=conceptCards(concept,state.plan.units);
  if(!branch.length)return;
  setSlideDirection(index>(state.activeConcept||0)?'next':'prev');
  setQuestion('');
  await save({...state,activeConcept:index,active:state.plan.units.flatMap(u=>u.cards)
    .findIndex(c=>c.id===branch[0].id)});
   if(!state.remote&&!state.conceptOverviews?.[concept.id+':'+state.mode])await work(teachConceptOverview);
 }
 function stateConceptForCard(index:number){
  const state=current.current,card=state.plan?.units.flatMap(u=>u.cards)[index];
  return card&&state.plan&&state.concepts?findConceptIndex(state.concepts,state.plan.units,card.id):(state.activeConcept||0);
 }
 async function change(index:number,mode=course.mode){
  if(control.current||index<0||index>=(current.current.plan?.units.flatMap(u=>u.cards).length||0))return;
  // Selecting a subtopic does not increment the main slide number.
  setQuestion('');
  if(current.current.remote){
   await save({...current.current,active:index,activeConcept:stateConceptForCard(index),mode});
   return;
  }
  await work(async signal=>{await save({...current.current,active:index,activeConcept:stateConceptForCard(index),mode});const card=current.current.plan?.units.flatMap(u=>u.cards)[index];if(card&&!current.current.lessons[card.id+':'+mode])await teach(signal);});
 }
 function onSlideTouchStart(event:TouchEvent<HTMLDivElement>){
  const target=event.target;
  if(event.touches.length!==1||!(target instanceof Element)||
     target.closest('button,a,input,textarea,select,summary,canvas,[contenteditable],.lesson-anatomy,.concept-visual,[data-no-swipe]')){
   gesture.current=null;trackRef.current?.style.removeProperty('--drag-x');return;
  }
  gesture.current={x:event.touches[0].clientX,y:event.touches[0].clientY};
  if(trackRef.current)trackRef.current.style.transition='none';
 }
 function onSlideTouchMove(event:TouchEvent<HTMLDivElement>){
  const start=gesture.current;
  if(!start||event.touches.length!==1)return;
  const dx=event.touches[0].clientX-start.x,dy=event.touches[0].clientY-start.y;
  if(Math.abs(dx)<Math.abs(dy)*1.2){trackRef.current?.style.removeProperty('--drag-x');return;}
  const max=Math.min(180,event.currentTarget.clientWidth*.35);
  trackRef.current?.style.setProperty('--drag-x',Math.min(max,Math.max(-max,dx))+'px');
 }
 function onSlideTouchEnd(event:TouchEvent<HTMLDivElement>){
  const start=gesture.current;gesture.current=null;
  trackRef.current?.style.removeProperty('--drag-x');
  trackRef.current?.style.removeProperty('transition');
  if(!start||event.changedTouches.length!==1||control.current)return;
  const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;
  if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.3)return;
  void changeConcept((current.current.activeConcept||0)+(dx<0?1:-1));
 }
 function onSlideKeyDown(event:KeyboardEvent<HTMLDivElement>){
  if(event.target!==event.currentTarget||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();void changeConcept((current.current.activeConcept||0)+(event.key==='ArrowLeft'?1:-1));
  }
 }
 function ask(text:string){if(text.trim())void work(signal=>teach(signal,text.trim()));}
 function answer(key:string,value?:number){const answers={...current.current.answers};if(value===undefined)delete answers[key];else answers[key]=value;void save({...current.current,answers}).catch(()=>setError('تعذر حفظ الإجابة محليًا.'));}
 const cards=course.plan?.units.flatMap(u=>u.cards)||[];
 const concepts=course.concepts||[];
 const concept=concepts[course.activeConcept||0];
 const conceptUnits=concept&&course.plan?conceptBranches(concept,course.plan.units):[];
 const conceptCardsCurrent=concept&&course.plan?conceptCards(concept,course.plan.units):[];
 const card=cards[course.active],unit=course.plan?.units.find(u=>u.cards.some(c=>c.id===card?.id));
 const conceptOverview=concept?course.conceptOverviews?.[concept.id+':'+course.mode]:undefined;
 const key=card?card.id+':'+course.mode:'',lesson=course.lessons[key],turns=course.turns[key]||[],points=course.pages.flatMap(p=>p.points||[]);
 const cardPoints=points.filter(p=>card?.source_ids.includes(p.id));
 const sourcePages=[...new Set(cardPoints.map(p=>p.page))].sort((a,b)=>a-b);
 const conceptSourceSet=new Set(concept&&course.plan?conceptSourceIds(concept,course.plan.units):[]);
 const conceptPages=[...new Set(points.filter(p=>conceptSourceSet.has(p.id)).map(p=>p.page))].sort((a,b)=>a-b);
 const planned=new Set((course.plan?.units||course.planning?.units||[]).flatMap(u=>u.cards.flatMap(c=>c.source_ids)));
 const covered=new Set(cards.flatMap(c=>(course.lessons[c.id+':'+course.mode]?.coverage||[]).map(p=>p.source_id)));
 const warnings=[...course.pages.flatMap(p=>(p.warnings||[]).map(w=>`صفحة ${p.number}: ${w}`)),...(course.planningNotices||[])];
 const conceptLessons=conceptCardsCurrent.map(c=>course.lessons[c.id+':'+course.mode]).filter((l):l is Explanation=>!!l);
 const conceptDone=concept&&conceptLessons.length===conceptCardsCurrent.length;
 if(!ready)return <div className="study-page" role="status">فتح مساحة المحاضرة…</div>;
 return <div className="study-page course-page" dir="rtl">
  <header className="study-title"><div><span className="study-badge">INTERACTIVE LECTURE EXPLAINER</span><h1>{course.plan?.title||'من المحاضرة إلى الفهم'}</h1><p>{course.name||'اقرئي المحاضرة أولًا، ثم استكشفي مفاهيمها.'}</p></div>
  <div className="lecture-library-actions">
   <button type="button" disabled={!!busy} onClick={async()=>{setLibrary(await listSavedLectures());setLibraryOpen(v=>!v);}}>محاضراتي المحفوظة</button>
   <button type="button" disabled={!!busy} onClick={()=>fileInput.current?.click()}><Upload size={17}/>محاضرة جديدة</button>
  </div></header>
  {libraryOpen&&<section className="lecture-saved-library" aria-label="المحاضرات المحفوظة">
   <h2>محاضراتي · الحفظ المحلي</h2>
   <p>تُحفظ كل محاضرة مستقلة في Safari على هذا الجهاز. الحفظ السحابي غير متاح إلى أن تُربط قاعدة بيانات خادم.</p>
   {library.length?library.map(item=><button type="button" key={item.id} disabled={!!busy}
    aria-current={item.id===course.id?'page':undefined} onClick={()=>void switchLecture(item.id)}>
    <strong dir="auto">{item.name}</strong><small>{item.pages} صفحة · {item.ready?'جاهزة':'تحت المعالجة'}</small></button>):
    <p>لم تُحفظ محاضرات في هذا المتصفح بعد.</p>}
  </section>
  <input ref={fileInput} hidden type="file" accept="application/pdf,image/*,.txt" onChange={e=>{const f=e.target.files?.[0];if(f)void openFile(f);e.target.value='';}}/>
  {busy&&<><p className="course-state" role="status">{({queued:'بانتظار المعالجة',extracting:'استخراج',structuring:'تنظيم',generating:'إنشاء ومراجعة',validating:'تدقيق',retrying:'إعادة المحاولة تلقائيًا',failed:'فشلت المعالجة',ready:'جاهزة'} as Record<Stage,string>)[course.phase||'queued']} · المحاضرة محفوظة ويمكن استكمالها بعد إعادة التحميل</p><Progress message={busy} cancel={()=>control.current?.abort()}/></>}
  {course.remote&&course.phase!=='ready'&&<div className="course-state" role="status">المعالجة الخلفية على الخادم · {({queued:'بانتظار التنفيذ',extracting:'استخراج المحتوى',structuring:'بناء الوحدات',generating:'إنشاء الشرح المراجع',validating:'التحقق',retrying:'إعادة محاولة تلقائية',failed:'توقفت المهمة',ready:'اكتملت'} as Record<Stage,string>)[course.phase||'queued']} · {course.remoteProgress||'تم حفظ المهمة'} · يمكنكِ مغادرة الصفحة والعودة لاحقًا</div>}
  {notice&&<p className="course-local-notice" role="status">{notice}</p>}
   {error&&<div className="study-error" role="alert">{error}<p>الصفحات والنقاط المكتملة محفوظة. لا تعيدي رفع الملف.</p>
    {!!course.pages.length&&!busy&&!course.remote&&<button className="primary" onClick={()=>void work(organize)}>إعادة المحاولة من آخر خطوة محفوظة</button>}
   </div>}
  {!course.pages.length&&!busy&&<section className="lecture-welcome"><BookOpen size={42}/><h2>افهمي الفكرة، ثم اختبري فهمك</h2><p>نص وشرح بصري في كل وحدة. السلايدات الأصلية متاحة للرجوع إليها.</p><button className="primary" onClick={()=>fileInput.current?.click()}>ارفعي المحاضرة · PDF أو صور</button><small>حتى 30 MB · لا تُحسب الأجزاء غير المقروءة كتغطية مكتملة</small><details><summary>أو الصقي نص المحاضرة</summary><textarea aria-label="نص المحاضرة" value={pasted} onChange={e=>setPasted(e.target.value)} rows={6}/><button disabled={!pasted.trim()} onClick={()=>void work(async signal=>{await save({...empty,name:'محاضرة نصية',pages:textPages(pasted),phase:'extracting'});await organize(signal);})}>ابدئي التعلم</button></details></section>}
  {!!course.pages.length&&<>
   <div className="course-toolbar"><span>{course.pages.filter(p=>p.points).length} / {course.pages.length} صفحات مقروءة · {planned.size} / {points.length} نقاط منظمة · {covered.size} / {points.length} نقاط شُرحت ورُوجعت</span><button aria-expanded={sources} onClick={()=>setSources(v=>!v)}>{sources?'إخفاء المرجع':'المحاضرة الأصلية وخريطة التغطية'}</button><select aria-label="مصدر الشرح" disabled={!!busy} value={course.mode} onChange={e=>void change(course.active,e.target.value)}><option value="lecture_only">Lecture only · المحاضرة فقط</option><option value="supplemental">المحاضرة + توضيح إضافي</option></select></div>
   {!!warnings.length&&<details className="study-warning"><summary>{warnings.length} ملاحظات على القراءة تحتاج مراجعتك</summary>{warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
   {sources&&<section className="course-sources"><h2>الأصل والتغطية</h2><p>التغطية تتتبع النقاط المستخرجة، وليست ضمانًا لصحة قراءة كل تفصيل بصري. راجعي التنبيهات والصور الأصلية.</p>{course.pages.map(p=><details key={p.number}><summary>صفحة {p.number} · {p.title||'المصدر'} · {p.points?.length??'لم تُقرأ'} نقاط</summary>{p.image&&<img src={p.image} alt={`الصفحة الأصلية ${p.number}`} loading="lazy"/>}<p className="preserve" dir="auto">{p.text}</p>{p.points?.map(point=>{const destination=cards.find(c=>c.source_ids.includes(point.id));return <div key={point.id} className="coverage-row"><p dir="auto">{point.text}</p><span>{covered.has(point.id)?'يوجد شرح مراجع':'بانتظار الشرح'} · {destination?.title||'بانتظار التنظيم'}</span>{destination&&<button disabled={!!busy} onClick={()=>{setSources(false);void change(cards.indexOf(destination));}}>اذهبي للشرح</button>}</div>;})}</details>)}</section>}
   {!course.plan&&!busy&&!course.remote&&<section className="study-card"><h2>استكملي بناء الوحدات</h2><p>سنقرأ الصفحات المتبقية ثم نرتب جميع النقاط المستخرجة.</p><button onClick={()=>void work(organize)}>استكمال المعالجة</button></section>}
   {course.plan&&card&&unit&&concept&&<div className="course-layout">
    <nav className="course-map" aria-label="الأفكار الرئيسية">{concepts.map((main,i)=><details key={main.id} open={main.id===concept.id}>
 <summary>{i+1}. {main.title}</summary>
 {main.unit_ids.map(id=>{const branch=course.plan!.units.find(u=>u.id===id);return branch?<div key={id} className="concept-nav-branch">
  <strong>{branch.title}</strong>
  {branch.cards.map(c=><button key={c.id} disabled={!!busy} aria-current={c.id===card.id?'step':undefined}
   onClick={()=>void change(cards.indexOf(c))}>{course.lessons[c.id+':'+course.mode]?'✓ ':''}{c.title}</button>)}
 </div>:null;})}
 </details>)}</nav>
    <section className="course-teaching" aria-label="سلايدات الشرح">
     <nav className="course-slide-rail" aria-label="تصفح المفاهيم الرئيسية">
 {concepts.map((main,i)=>({main,i})).filter(({i})=>Math.abs(i-(course.activeConcept||0))<=2).map(({main,i})=>
  <button key={main.id} type="button" className="course-rail-card"
   aria-current={i===(course.activeConcept||0)?'step':undefined}
   disabled={!!busy} onClick={()=>void changeConcept(i)} title={main.title}>
   <span className="course-rail-index">{i+1}</span><span className="course-rail-name">{main.title}</span>
  </button>)}
 </nav>
     <nav className="course-learning-tabs" role="tablist" aria-label="أدوات السلايد">
      {([['explain','الشرح'],['visual','Visual'],['quiz','Quiz'],['3d','3D'],['notes','ملاحظاتي']] as const).map(([id,label])=>
       <button key={id} type="button" role="tab" aria-selected={studyTab===id} aria-controls="course-slide-content" onClick={()=>setStudyTab(id)}>{label}</button>)}
     </nav>
     <div className="course-slide-viewport" onTouchStart={onSlideTouchStart} onTouchMove={onSlideTouchMove} onTouchEnd={onSlideTouchEnd} onTouchCancel={()=>{gesture.current=null;trackRef.current?.style.removeProperty('--drag-x');trackRef.current?.style.removeProperty('transition');}} onKeyDown={onSlideKeyDown} tabIndex={0} aria-label="سلايدات أفقية: اسحبي لليسار للتالي، أو استخدمي أسهم لوحة المفاتيح">
     <div ref={trackRef} className="course-swipe-track" dir="rtl">
      
     <div key={card.id+':'+course.mode} className={'course-slide-panel course-slide-motion-'+slideDirection} id="course-slide-content" role="tabpanel" aria-label={card.title}>
     <div className="course-card-heading concept-master-heading">
 <small>MAIN CONCEPT · الفكرة الرئيسية {(course.activeConcept||0)+1} من {concepts.length}</small>
 <h2>{concept.title}</h2><p>{concept.objective}</p>
 <small>المصادر: {conceptPages.map(n=>'ص '+n).join(' · ')} · {conceptSourceSet.size} نقطة محفوظة</small>
 </div>
 {!course.semanticClustering&&<div className="concept-provisional-note">
 <p>هذا تجميع مؤقت يحافظ على مصادر المحاضرة، وليس تحليلًا دلاليًا معتمدًا.</p>
 <button disabled={!!busy} onClick={()=>void work(async signal=>{
  await save({...current.current,concepts:undefined,activeConcept:undefined});
  await consolidateConcepts(signal);
 })}>إعادة تحليل المفاهيم دلاليًا</button></div>}
 {studyTab==='explain'&&<section className="concept-overview" aria-label="شرح تمهيدي للمفهوم الرئيسي من الصفر">
  <h3>الفكرة الجوهرية · من الصفر</h3>
  {conceptOverview?<><p className="concept-overview-context">تمهيد طبي مبني على نقاط موثقة من تفرعات هذه الفكرة. المعلومات المتبقية موجودة في التفرعات أدناه.</p>
   {conceptOverview.clinical_layers?
    <ClinicalTeachingLayers layers={conceptOverview.clinical_layers} registry={conceptOverview.source_registry}
     sourceImages={course.pages.filter(p=>conceptPages.includes(p.number)).map(p=>({page:p.number,image:p.image}))} view="explain"/>:
    <p dir="auto">{conceptOverview.explanation}</p>}
   <MedicalAtlasLayouts layouts={conceptOverview.textbook_layouts} callouts={conceptOverview.clinical_callouts}
    registry={conceptOverview.source_registry} sourceImages={course.pages.filter(p=>conceptPages.includes(p.number)).map(p=>({page:p.number,image:p.image}))} view="explain"/>
  </>:<><p>سنبدأ بتعريف المفهوم خطوة خطوة، ثم ننتقل إلى التفرعات والآلية والأهمية السريرية.</p>
   {!busy&&<button className="primary" onClick={()=>void work(teachConceptOverview)}>إنشاء شرح المفهوم من الصفر</button>}
  </>}
 </section>}
 <section className="concept-branch-tree concept-editorial-tree" aria-label="التفرعات التعليمية لهذا المفهوم">
  <header className="concept-editorial-heading">
   <span>MEDICAL ATLAS / CONCEPT RELATIONSHIPS</span>
   <h3>خريطة المفهوم · اختاري التفرع لشرحه من الصفر</h3>
  </header>
  <div className="concept-tree-hub" dir="auto">{concept.title}</div>
  <div className="concept-tree-stem" aria-hidden="true"/>
  <div className="concept-branch-grid">{conceptUnits.map((branch,i)=><article className="concept-branch-node" key={branch.id}>
   <div className="concept-branch-heading"><span>{i+1}</span><strong>{branch.title}</strong></div>
   <p>{branch.objective}</p>
   <div className="concept-branch-subtopics">{branch.cards.map(sub=><button key={sub.id}
    type="button" disabled={!!busy} aria-pressed={sub.id===card.id}
    className={sub.id===card.id?'concept-subtopic-active':''}
    onClick={()=>void change(cards.indexOf(sub))}>
    {course.lessons[sub.id+':'+course.mode]?'✓ ':''}{sub.title}</button>)}</div>
  </article>)}</div>
 </section>
 <div className="concept-active-branch"><span>التفرع التعليمي المختار</span>
 <h3>{card.title}</h3><small>المصدر: {sourcePages.map(n=>'ص '+n).join(' · ')}</small></div>
     {studyTab==='visual'&&<div className="course-visual-rebuild">
       <span>MEDICAL TEXTBOOK VISUAL</span>
       <p>للسلايدات القديمة: أعيدي توليد المخطط الطبي المتصل وفق المرجع، من النقاط الأصلية دون حذف الشرح المحفوظ.</p>
       <button disabled={!!busy} onClick={()=>void work(rebuildEditorialVisual)}>إعادة بناء الرسم بصريًا</button>
      </div>}
     {studyTab==='notes'&&<section className="course-slide-notes" data-no-swipe><h3>ملاحظاتي · {card.title}</h3><textarea rows={10} aria-label="ملاحظات هذا السلايد" placeholder="دوّني ما فهمتِه بطريقتك…" value={course.notes?.[card.id]||''} onChange={event=>{const notes={...current.current.notes,[card.id]:event.target.value};void save({...current.current,notes});}}/><small>محفوظة على جهازك ضمن هذه المحاضرة.</small></section>}
     {studyTab!=='notes'&&(lesson?<><LessonJourney key={key+':'+studyTab} view={studyTab} lesson={lesson} sourceImages={course.pages.filter(p=>sourcePages.includes(p.number)).map(p=>({page:p.number,image:p.image}))} slide={cardPoints.map(p=>p.text).join('\n')} answers={course.answers} onAnswer={answer} prefix={key} busy={!!busy} onAsk={ask}/>{studyTab==='explain'&&<details className="course-details"><summary>شرح جميع نقاط هذه الفكرة · {lesson.coverage?.length||0} نقاط</summary>{lesson.coverage?.map(item=><section key={item.source_id}><p dir="auto">{item.explanation}</p><small>من صفحة {points.find(p=>p.id===item.source_id)?.page}</small></section>)}</details>}</>:<section className="course-pending-lesson" role="status" aria-label="حالة إنشاء سلايد الشرح">
       <h3>{busy?'جارٍ إعداد هذا السلايد ومراجعته…':'هذا السلايد بانتظار الشرح الطبي'}</h3>
       <p>{studyTab==='quiz'?'أسئلة Quiz ستظهر بعد إنشاء شرح مراجَع لهذا السلايد.':studyTab==='visual'?'الرسوم والجداول الموثقة ستظهر بعد اكتمال التوليد.':studyTab==='3d'?'الربط بأطلس 3D يتطلب تركيبًا مطابقًا ومراجعًا.':'المحاضرة محفوظة، لكن هذا السلايد لم يحصل على شرح Gemini معتمد بعد.'}</p>
       {!busy&&<button className="primary" onClick={()=>void work(signal=>teach(signal))}>إنشاء شرح هذا السلايد</button>}
       <details className="course-pending-source" open={!busy}><summary>محتوى المحاضرة الأصلي · {cardPoints.length} نقاط</summary>
        {cardPoints.length?cardPoints.map(p=><div key={p.id} className="course-source-item"><small>صفحة {p.page} · {p.kind}</small><p dir="auto">{p.text}</p></div>):<p>تعذر ربط النقاط بهذا السلايد؛ راجعي خريطة التغطية.</p>}
       </details>
      </section>)}
     {studyTab==='explain'&&turns.map((turn,i)=><section className="course-followup" key={turn.lesson.id||i}><h3>{turn.question}</h3><LessonJourney lesson={turn.lesson} slide={cardPoints.map(p=>p.text).join('\n')} answers={course.answers} onAnswer={answer} prefix={key+':turn:'+i} busy={!!busy} onAsk={ask}/></section>)}
     {studyTab==='explain'&&lesson&&<><div className="followup-chips"><button disabled={!!busy} onClick={()=>ask('بسّطي الفكرة مع الحفاظ على تفاصيلها')}>بسّطيها</button><button disabled={!!busy} onClick={()=>ask('لماذا؟ اشرحي الآلية من محتوى هذه الفكرة')}>لماذا؟</button><button disabled={!!busy} onClick={()=>ask('اختبريني بسؤال تطبيق جديد من هذه الفكرة')}>اختبريني</button><button disabled={!!busy} onClick={()=>ask('وضحي الفكرة بصريًا')}>وضحي بصريًا</button></div><form className="course-question" onSubmit={e=>{e.preventDefault();ask(question);}}><label htmlFor="course-question">سؤال متابعة عن هذه الفكرة</label><textarea id="course-question" maxLength={1800} value={question} onChange={e=>setQuestion(e.target.value)} rows={2}/><button disabled={!!busy||!question.trim()}>اسألي</button></form></>}
     {studyTab==='explain'&&<section className="course-unit-summary concept-master-summary">
 <h2>خلاصة الفكرة الرئيسية</h2>
 {!conceptDone&&<p>بقي {conceptCardsCurrent.length-conceptLessons.length} تفرعات تحتاج شرحًا مراجعًا. التفرعات ليست سلايدات رئيسية مستقلة.</p>}
 <h3>الفهم الأساسي</h3>{conceptLessons.flatMap(l=>l.summary||[l.explanation]).map((line,i)=><p key={i}>{line}</p>)}
 <h3>نقاط مهمة للحفظ</h3><ul>{conceptLessons.flatMap(l=>l.high_yield||[]).map((line,i)=><li key={i}>{line}</li>)}</ul>
 <details><summary>مصادر جميع التفرعات · {conceptSourceSet.size} نقطة</summary>
 {points.filter(p=>conceptSourceSet.has(p.id)).map(p=><p key={p.id} dir="auto"><small>ص {p.page}</small> {p.text}</p>)}
 </details>
 </section>}
     </div>
      
     </div></div>
     <div className="course-pagination">
 <button disabled={!!busy||(course.activeConcept||0)===0} onClick={()=>void changeConcept((course.activeConcept||0)-1)}><ChevronRight size={18}/>السابق</button>
 <span dir="ltr" aria-label={`مفهوم ${(course.activeConcept||0)+1} من ${concepts.length}`}>{(course.activeConcept||0)+1} / {concepts.length}</span>
 <button disabled={!!busy||(course.activeConcept||0)===concepts.length-1} onClick={()=>void changeConcept((course.activeConcept||0)+1)}>الفكرة التالية<ChevronLeft size={18}/></button>
 </div>
     {studyTab==='explain'&&(course.activeConcept||0)===concepts.length-1&&<section className="course-unit-summary"><h2>مراجعة المحاضرة كاملة</h2><p>{covered.size} من {points.length} نقطة مستخرجة لها شرح مراجع.{warnings.length>0?' توجد ملاحظات قراءة تحتاج مراجعة الأصل.':''}</p>{course.plan.units.map(u=><details key={u.id}><summary>{u.title}</summary>{u.cards.map(c=><div key={c.id}><h3>{c.title}</h3>{course.lessons[c.id+':'+course.mode]?.summary?.map((s,i)=><p key={i}>{s}</p>)}{!course.lessons[c.id+':'+course.mode]&&<button disabled={!!busy} onClick={()=>void change(cards.indexOf(c))}>أكملي شرح هذه الفكرة</button>}</div>)}</details>)}</section>}
    </section>
   </div>}
  </>}
 </div>;
}
