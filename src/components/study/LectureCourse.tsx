import {useEffect,useRef,useState,type TouchEvent,type KeyboardEvent} from 'react';
import {pdfjs} from 'react-pdf';
import {BookOpen,Upload,ChevronLeft,ChevronRight,Sparkles} from 'lucide-react';
import {readStudy,writeStudy,studyRequest} from '../../lib/study-store';
import {appendLecturePage,createLectureJob,getLectureJob,startLectureJob,type LectureJobHandle} from '../../lib/lecture-jobs';
import {LessonJourney,type LearningTab} from './LessonJourney';
import type {Explanation} from './types';

type Point={id:string;page:number;kind:string;text:string;origin:string;item_id?:string;page_number?:number;content_type?:string;source_ref?:string;bbox?:number[]};
type SourcePage={number:number;text:string;image?:string;title?:string;points?:Point[];warnings?:string[]};
type Card={id:string;title:string;source_ids:string[]};
type Unit={id:string;title:string;objective:string;cards:Card[]};
type Plan={title:string;units:Unit[]};
type Turn={question:string;lesson:Explanation};
type StudyTab=LearningTab|'notes';
type Stage='queued'|'extracting'|'structuring'|'generating'|'validating'|'retrying'|'failed'|'ready';
type Course={name:string;pages:SourcePage[];plan?:Plan;remote?:LectureJobHandle;remoteProgress?:string;planning?:{next:number;units:Unit[]};planningNotices?:string[];phase?:Stage;active:number;mode:string;lessons:Record<string,Explanation>;turns:Record<string,Turn[]>;answers:Record<string,number>;notes?:Record<string,string>};
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
 const [course,setCourse]=useState<Course>(empty),[ready,setReady]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [question,setQuestion]=useState(''),[pasted,setPasted]=useState(''),[sources,setSources]=useState(false);
 const [studyTab,setStudyTab]=useState<StudyTab>('explain'),[slideDirection,setSlideDirection]=useState<'next'|'prev'>('next');
 const gesture=useRef<{x:number;y:number}|null>(null);
 const current=useRef(course),control=useRef<AbortController|null>(null),fileInput=useRef<HTMLInputElement>(null),lastRequest=useRef(0);
 function update(value:Course){current.current=value;setCourse(value);}
 async function save(value:Course){await writeStudy(STORE,value);update(value);}
 useEffect(()=>{let live=true;void readStudy<Course>(STORE).then(c=>{if(live){if(c){current.current=c;setCourse(c);}setReady(true);}}).catch(()=>{if(live){setError('تعذر فتح المحاضرة المحفوظة محليًا.');setReady(true);}});return()=>{live=false;control.current?.abort();};},[]);
 useEffect(()=>{
  if(!ready||!course.pages.length||control.current||course.remote)return;
  const first=course.plan?.units[0]?.cards[0];
  if(!course.plan||(first&&!course.lessons[first.id+':'+course.mode])){
   void work(organize);
  }
 // Run only after restoring a saved course, not after every processing checkpoint.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ready]);
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
  // Sequential and paced: no burst of model requests for a large lecture.
  const delay=Math.max(0,11000-(Date.now()-lastRequest.current));
  if(delay)await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},delay);signal.addEventListener('abort',abort,{once:true});});
  signal.throwIfAborted();lastRequest.current=Date.now();return studyRequest('lecture',body,signal);
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
 async function organize(signal:AbortSignal){
  let state=current.current;
  if(state.plan){
   const first=state.plan.units[0]?.cards[0];
   if(first&&!state.lessons[first.id+':'+state.mode])await teach(signal);
   await save({...current.current,phase:'ready'});
   return;
  }
  if(state.phase!=='extracting') {state={...state,phase:'extracting'};await save(state);}
  for(let i=0;i<state.pages.length;){
   signal.throwIfAborted();if(state.pages[i].points){i++;continue;}
   const batch:SourcePage[]=[];let bytes=0;
   for(let j=i;j<state.pages.length&&batch.length<3;j++){
    const p=state.pages[j];if(p.points)break;if(batch.length&&bytes+(p.image?.length||0)>2700000)break;
    batch.push(p);bytes+=p.image?.length||0;
   }
   setBusy(`قراءة النصوص والرسومات والجداول · الصفحات ${batch.map(p=>p.number).join('، ')} من ${state.pages.length}`);
   const result=await request({operation:'extract',pages:batch.map(p=>({number:p.number,text:p.text,image:p.image}))},signal);signal.throwIfAborted();
   const extracted=result.pages as SourcePage[];
   state={...state,phase:'extracting',pages:state.pages.map(p=>({...p,...extracted.find(r=>r.number===p.number)}))};await save(state);i+=batch.length;
  }
  const points=state.pages.flatMap(p=>p.points||[]);
  if(!points.length)throw new Error('لم نتمكن من قراءة محتوى هذه المحاضرة. افتحي الأصل وتحققي من وضوح الصفحات.');
  // Planning the entire PDF in one model request can overflow model output or
  // hit the serverless deadline. Commit each small planning batch to IndexedDB.
  let next=state.planning?.next??0;
  let units=state.planning?.units||[];
  for(;next<points.length;){
   signal.throwIfAborted();
   const batch:Point[]=[];let characters=0;
   while(next+batch.length<points.length&&batch.length<32){
    const item=points[next+batch.length];
    if(batch.length&&characters+item.text.length>18000)break;
    batch.push(item);characters+=item.text.length;
   }
   setBusy(`تنظيم المفاهيم وربط المصادر · ${next+batch.length} / ${points.length} نقطة`);
   const result=await request({operation:'plan',title:state.name,points:batch},signal);
   signal.throwIfAborted();
   const offset=units.length;
   const incoming=(result.plan as Plan).units.map((u,ui)=>({
    ...u,id:`u${offset+ui+1}`,cards:u.cards.map((card,ci)=>({...card,id:`u${offset+ui+1}-c${ci+1}`}))
   }));
   units=[...units,...incoming];next+=batch.length;
   const notices=[...(state.planningNotices||[])];
   if(result.recovered_missing_ids)notices.push(`المجموعة ${Math.ceil(next/32)}: استُعيدت نقاط لم يصنفها Gemini آليًا؛ ستظهر في سلايدات شرح منفصلة.`);
   state={...state,phase:'structuring',planning:{next,units},planningNotices:notices};await save(state);
  }
  // This short second pass reorders units across page batches without
  // resending the entire original lecture to the provider.
  if(units.length>1&&units.length<=120){
   setBusy('إعادة ترتيب جميع الوحدات حسب تسلسل الفهم…');
   try {
    const output=await request({operation:'reorder',units:units.map(u=>({id:u.id,title:u.title,objective:u.objective}))},signal);
    signal.throwIfAborted();
    const byId=new Map(units.map(u=>[u.id,u]));
    const order=output.unit_ids as string[];
    if(order.length!==units.length||new Set(order).size!==units.length||order.some(id=>!byId.has(id)))throw new Error('ترتيب غير مكتمل');
    units=order.map(id=>byId.get(id)!);
   }catch(err){
    signal.throwIfAborted();
    // Preserve the locally valid per-batch sequence rather than discarding
    // the extracted lecture when the optional global reorder is unavailable.
    state={...state,planningNotices:[...(state.planningNotices||[]),'تعذرت إعادة ترتيب الوحدات بين المجموعات؛ بقي ترتيب كل مجموعة تعليميًا ومعلوماتها محفوظة.']};
    await save(state);
   }
  }
  const assigned=units.flatMap(u=>u.cards.flatMap(c=>c.source_ids));
  const ids=new Set(points.map(p=>p.id));
  if(assigned.length!==points.length||new Set(assigned).size!==ids.size||assigned.some(id=>!ids.has(id)))
   throw new Error('خطة الشرح لا تغطي جميع نقاط المحاضرة؛ لن نحذف أي معلومات.');
  state={...state,planning:undefined,plan:{title:state.name,units},active:0,phase:'generating'};
  await save(state);
  await teach(signal);
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
   setError('التخزين على الخادم غير مفعّل بعد؛ ستعمل هذه المحاضرة بنظام الحفظ المحلي الحالي.');
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
  const data=await request({operation:'teach',title:state.name+' · '+card.title,points,source_mode:state.mode,question:followup,conversation,requested_tool:/اختبر|سؤال جديد|سؤال مشابه/.test(followup)?'quiz':/بصري|رسم/.test(followup)?'visual':'explain'},signal);signal.throwIfAborted();
  const lesson:Explanation={...data.lesson,id:crypto.randomUUID(),source_mode:state.mode};
  if(followup)await save({...current.current,turns:{...current.current.turns,[key]:[...turns,{question:followup,lesson}]}});
  else await save({...current.current,lessons:{...current.current.lessons,[key]:lesson}});
 }
 async function change(index:number,mode=course.mode){
  if(control.current||index<0||index>=(current.current.plan?.units.flatMap(u=>u.cards).length||0))return;
  if(index!==current.current.active)setSlideDirection(index>current.current.active?'next':'prev');
  setQuestion('');
  if(current.current.remote){
   await save({...current.current,active:index,mode});
   return;
  }
  await work(async signal=>{await save({...current.current,active:index,mode});const card=current.current.plan?.units.flatMap(u=>u.cards)[index];if(card&&!current.current.lessons[card.id+':'+mode])await teach(signal);});
 }
 function onSlideTouchStart(event:TouchEvent<HTMLDivElement>){
  const target=event.target;
  if(event.touches.length!==1||!(target instanceof Element)||
     target.closest('button,a,input,textarea,select,summary,canvas,[contenteditable],.lesson-anatomy,.concept-visual,[data-no-swipe]')){
   gesture.current=null;return;
  }
  gesture.current={x:event.touches[0].clientX,y:event.touches[0].clientY};
 }
 function onSlideTouchEnd(event:TouchEvent<HTMLDivElement>){
  const start=gesture.current;gesture.current=null;
  if(!start||event.changedTouches.length!==1||control.current)return;
  const dx=event.changedTouches[0].clientX-start.x,dy=event.changedTouches[0].clientY-start.y;
  if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.3)return;
  void change(current.current.active+(dx<0?1:-1));
 }
 function onSlideKeyDown(event:KeyboardEvent<HTMLDivElement>){
  if(event.target!==event.currentTarget||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();void change(current.current.active+(event.key==='ArrowLeft'?1:-1));
  }
 }
 function ask(text:string){if(text.trim())void work(signal=>teach(signal,text.trim()));}
 function answer(key:string,value?:number){const answers={...current.current.answers};if(value===undefined)delete answers[key];else answers[key]=value;void save({...current.current,answers}).catch(()=>setError('تعذر حفظ الإجابة محليًا.'));}
 const cards=course.plan?.units.flatMap(u=>u.cards)||[],card=cards[course.active],unit=course.plan?.units.find(u=>u.cards.some(c=>c.id===card?.id));
 const key=card?card.id+':'+course.mode:'',lesson=course.lessons[key],turns=course.turns[key]||[],points=course.pages.flatMap(p=>p.points||[]);
 const cardPoints=points.filter(p=>card?.source_ids.includes(p.id));
 const sourcePages=[...new Set(cardPoints.map(p=>p.page))].sort((a,b)=>a-b);
 const covered=new Set(cards.flatMap(c=>(course.lessons[c.id+':'+course.mode]?.coverage||[]).map(p=>p.source_id)));
 const warnings=[...course.pages.flatMap(p=>(p.warnings||[]).map(w=>`صفحة ${p.number}: ${w}`)),...(course.planningNotices||[])];
 const unitLessons=unit?.cards.map(c=>course.lessons[c.id+':'+course.mode]).filter((l):l is Explanation=>!!l)||[];
 const unitDone=unit&&unitLessons.length===unit.cards.length;
 if(!ready)return <div className="study-page" role="status">فتح مساحة المحاضرة…</div>;
 return <div className="study-page course-page" dir="rtl">
  <header className="study-title"><div><span className="study-badge">INTERACTIVE LECTURE EXPLAINER</span><h1>{course.plan?.title||'من المحاضرة إلى الفهم'}</h1><p>{course.name||'محاضرتك تُقرأ كاملة، ثم تتحول إلى وحدات وسلايدات شرح مترابطة.'}</p></div><button disabled={!!busy} onClick={()=>fileInput.current?.click()}><Upload size={17}/>محاضرة جديدة</button></header>
  <input ref={fileInput} hidden type="file" accept="application/pdf,image/*,.txt" onChange={e=>{const f=e.target.files?.[0];if(f)void openFile(f);e.target.value='';}}/>
  {busy&&<><p className="course-state" role="status">{({queued:'بانتظار المعالجة',extracting:'استخراج',structuring:'تنظيم',generating:'إنشاء ومراجعة',validating:'تدقيق',retrying:'إعادة المحاولة تلقائيًا',failed:'فشلت المعالجة',ready:'جاهزة'} as Record<Stage,string>)[course.phase||'queued']} · المحاضرة محفوظة ويمكن استكمالها بعد إعادة التحميل</p><Progress message={busy} cancel={()=>control.current?.abort()}/></>}
  {course.remote&&course.phase!=='ready'&&<div className="course-state" role="status">المعالجة الخلفية على الخادم · {({queued:'بانتظار التنفيذ',extracting:'استخراج المحتوى',structuring:'بناء الوحدات',generating:'إنشاء الشرح المراجع',validating:'التحقق',retrying:'إعادة محاولة تلقائية',failed:'توقفت المهمة',ready:'اكتملت'} as Record<Stage,string>)[course.phase||'queued']} · {course.remoteProgress||'تم حفظ المهمة'} · يمكنكِ مغادرة الصفحة والعودة لاحقًا</div>}
  {error&&<div className="study-error" role="alert">{error}<p>الخطوات المكتملة محفوظة. يمكنك استكمال الطلب دون البدء من جديد.</p></div>}
  {!course.pages.length&&!busy&&<section className="lecture-welcome"><BookOpen size={42}/><h2>افهمي الفكرة، ثم اختبري فهمك</h2><p>نص وشرح بصري في كل وحدة. السلايدات الأصلية متاحة للرجوع إليها.</p><button className="primary" onClick={()=>fileInput.current?.click()}>ارفعي المحاضرة · PDF أو صور</button><small>حتى 30 MB · لا تُحسب الأجزاء غير المقروءة كتغطية مكتملة</small><details><summary>أو الصقي نص المحاضرة</summary><textarea aria-label="نص المحاضرة" value={pasted} onChange={e=>setPasted(e.target.value)} rows={6}/><button disabled={!pasted.trim()} onClick={()=>void work(async signal=>{await save({...empty,name:'محاضرة نصية',pages:textPages(pasted),phase:'extracting'});await organize(signal);})}>ابدئي التعلم</button></details></section>}
  {!!course.pages.length&&<>
   <div className="course-toolbar"><span>{course.pages.filter(p=>p.points).length} / {course.pages.length} صفحات مقروءة · {covered.size} / {points.length} نقاط لها شرح مراجع</span><button aria-expanded={sources} onClick={()=>setSources(v=>!v)}>{sources?'إخفاء المرجع':'المحاضرة الأصلية وخريطة التغطية'}</button><select aria-label="مصدر الشرح" disabled={!!busy} value={course.mode} onChange={e=>void change(course.active,e.target.value)}><option value="lecture_only">Lecture only · المحاضرة فقط</option><option value="supplemental">المحاضرة + توضيح إضافي</option></select></div>
   {!!warnings.length&&<details className="study-warning"><summary>{warnings.length} ملاحظات على القراءة تحتاج مراجعتك</summary>{warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
   {sources&&<section className="course-sources"><h2>الأصل والتغطية</h2><p>التغطية تتتبع النقاط المستخرجة، وليست ضمانًا لصحة قراءة كل تفصيل بصري. راجعي التنبيهات والصور الأصلية.</p>{course.pages.map(p=><details key={p.number}><summary>صفحة {p.number} · {p.title||'المصدر'} · {p.points?.length??'لم تُقرأ'} نقاط</summary>{p.image&&<img src={p.image} alt={`الصفحة الأصلية ${p.number}`} loading="lazy"/>}<p className="preserve" dir="auto">{p.text}</p>{p.points?.map(point=>{const destination=cards.find(c=>c.source_ids.includes(point.id));return <div key={point.id} className="coverage-row"><p dir="auto">{point.text}</p><span>{covered.has(point.id)?'يوجد شرح مراجع':'بانتظار الشرح'} · {destination?.title||'بانتظار التنظيم'}</span>{destination&&<button disabled={!!busy} onClick={()=>{setSources(false);void change(cards.indexOf(destination));}}>اذهبي للشرح</button>}</div>;})}</details>)}</section>}
   {!course.plan&&!busy&&!course.remote&&<section className="study-card"><h2>استكملي بناء الوحدات</h2><p>سنقرأ الصفحات المتبقية ثم نرتب جميع النقاط المستخرجة.</p><button onClick={()=>void work(organize)}>استكمال المعالجة</button></section>}
   {course.plan&&card&&unit&&<div className="course-layout">
    <nav className="course-map" aria-label="وحدات الفهم">{course.plan.units.map((u,i)=><details key={u.id} open={u.id===unit.id}><summary>{i+1}. {u.title}</summary>{u.cards.map(c=><button key={c.id} disabled={!!busy} aria-current={c.id===card.id?'step':undefined} onClick={()=>void change(cards.indexOf(c))}>{course.lessons[c.id+':'+course.mode]?'✓ ':''}{c.title}</button>)}</details>)}</nav>
    <section className="course-teaching" aria-label="سلايدات الشرح">
     <nav className="course-learning-tabs" role="tablist" aria-label="أدوات السلايد">
      {([['explain','الشرح'],['visual','Visual'],['quiz','Quiz'],['3d','3D'],['notes','ملاحظاتي']] as const).map(([id,label])=>
       <button key={id} type="button" role="tab" aria-selected={studyTab===id} aria-controls="course-slide-content" onClick={()=>setStudyTab(id)}>{label}</button>)}
     </nav>
     <div className="course-slide-viewport" onTouchStart={onSlideTouchStart} onTouchEnd={onSlideTouchEnd} onTouchCancel={()=>{gesture.current=null;}} onKeyDown={onSlideKeyDown} tabIndex={0} aria-label="سلايدات أفقية: اسحبي لليسار للتالي، أو استخدمي أسهم لوحة المفاتيح">
     <div key={card.id+':'+course.mode} className={'course-slide-panel course-slide-motion-'+slideDirection} id="course-slide-content" role="tabpanel" aria-label={card.title}>
     <div className="course-card-heading"><small>{unit.title} · سلايد شرح {course.active+1} / {cards.length}</small><h2>{card.title}</h2><p>{unit.objective}</p><small>المصدر: {sourcePages.map(n=>'ص '+n).join(' · ')}</small></div>
     {studyTab==='notes'&&<section className="course-slide-notes" data-no-swipe><h3>ملاحظاتي · {card.title}</h3><textarea rows={10} aria-label="ملاحظات هذا السلايد" placeholder="دوّني ما فهمتِه بطريقتك…" value={course.notes?.[card.id]||''} onChange={event=>{const notes={...current.current.notes,[card.id]:event.target.value};void save({...current.current,notes});}}/><small>محفوظة على جهازك ضمن هذه المحاضرة.</small></section>}
     {studyTab!=='notes'&&(lesson?<><LessonJourney key={key+':'+studyTab} view={studyTab} lesson={lesson} slide={cardPoints.map(p=>p.text).join('\n')} answers={course.answers} onAnswer={answer} prefix={key} busy={!!busy} onAsk={ask}/>{studyTab==='explain'&&<details className="course-details"><summary>شرح جميع نقاط هذه الفكرة · {lesson.coverage?.length||0} نقاط</summary>{lesson.coverage?.map(item=><section key={item.source_id}><p dir="auto">{item.explanation}</p><small>من صفحة {points.find(p=>p.id===item.source_id)?.page}</small></section>)}</details>}</>:!busy&&<button onClick={()=>void work(signal=>teach(signal))}>إنشاء سلايد الشرح</button>)}
     {studyTab==='explain'&&turns.map((turn,i)=><section className="course-followup" key={turn.lesson.id||i}><h3>{turn.question}</h3><LessonJourney lesson={turn.lesson} slide={cardPoints.map(p=>p.text).join('\n')} answers={course.answers} onAnswer={answer} prefix={key+':turn:'+i} busy={!!busy} onAsk={ask}/></section>)}
     {studyTab==='explain'&&lesson&&<><div className="followup-chips"><button disabled={!!busy} onClick={()=>ask('بسّطي الفكرة مع الحفاظ على تفاصيلها')}>بسّطيها</button><button disabled={!!busy} onClick={()=>ask('لماذا؟ اشرحي الآلية من محتوى هذه الفكرة')}>لماذا؟</button><button disabled={!!busy} onClick={()=>ask('اختبريني بسؤال تطبيق جديد من هذه الفكرة')}>اختبريني</button><button disabled={!!busy} onClick={()=>ask('وضحي الفكرة بصريًا')}>وضحي بصريًا</button></div><form className="course-question" onSubmit={e=>{e.preventDefault();ask(question);}}><label htmlFor="course-question">سؤال متابعة عن هذه الفكرة</label><textarea id="course-question" maxLength={1800} value={question} onChange={e=>setQuestion(e.target.value)} rows={2}/><button disabled={!!busy||!question.trim()}>اسألي</button></form></>}
     {studyTab==='explain'&&unit.cards.at(-1)?.id===card.id&&<section className="course-unit-summary"><h2>خلاصة الوحدة</h2>{!unitDone&&<p>ما زالت {unit.cards.length-unitLessons.length} سلايدات شرح تحتاج فتحها لتكتمل مراجعة الوحدة.</p>}<h3>ما يجب فهمه</h3>{unitLessons.flatMap(l=>l.summary||[l.explanation]).map((s,i)=><p key={i}>{s}</p>)}<h3>نقاط للحفظ والمراجعة</h3><ul>{unitLessons.flatMap(l=>l.high_yield).map((s,i)=><li key={i}>{s}</li>)}</ul><h3>المصطلحات الأساسية</h3>{unitLessons.flatMap(l=>l.terms).map((t,i)=><p key={i}><strong>{t.term}</strong> — {t.meaning}</p>)}{unitLessons.filter(l=>l.clinical_connection?.text).map((l,i)=><p key={i}>العلاقة السريرية: {l.clinical_connection!.text} {l.clinical_connection!.basis==='additional'&&'· توضيح إضافي خارج محتوى المحاضرة'}</p>)}<details><summary>تم شرح هذه النقاط من المحاضرة</summary>{unit.cards.flatMap(c=>course.lessons[c.id+':'+course.mode]?.coverage||[]).map(p=><p key={p.source_id}>{points.find(s=>s.id===p.source_id)?.text}</p>)}</details></section>}
     </div></div>
     <div className="course-pagination"><button disabled={!!busy||course.active===0} onClick={()=>void change(course.active-1)}><ChevronRight size={18}/>السابق</button><span>{course.active+1} / {cards.length}</span><button disabled={!!busy||course.active===cards.length-1} onClick={()=>void change(course.active+1)}>الفكرة التالية<ChevronLeft size={18}/></button></div>
     {studyTab==='explain'&&course.active===cards.length-1&&<section className="course-unit-summary"><h2>مراجعة المحاضرة كاملة</h2><p>{covered.size} من {points.length} نقطة مستخرجة لها شرح مراجع.{warnings.length>0?' توجد ملاحظات قراءة تحتاج مراجعة الأصل.':''}</p>{course.plan.units.map(u=><details key={u.id}><summary>{u.title}</summary>{u.cards.map(c=><div key={c.id}><h3>{c.title}</h3>{course.lessons[c.id+':'+course.mode]?.summary?.map((s,i)=><p key={i}>{s}</p>)}{!course.lessons[c.id+':'+course.mode]&&<button disabled={!!busy} onClick={()=>void change(cards.indexOf(c))}>أكملي شرح هذه الفكرة</button>}</div>)}</details>)}</section>}
    </section>
   </div>}
  </>}
 </div>;
}
