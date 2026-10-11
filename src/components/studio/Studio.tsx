import {useEffect,useRef,useState} from 'react';
import {UploadCloud,BookOpenText,RefreshCw,Library,AlertTriangle,ArrowLeft,FileText} from 'lucide-react';
import {readStudy,writeStudy,studyRequest} from '../../lib/study-store';
import {ingestLecture} from './ingest';
import {StudioCanvas} from './StudioCanvas';
import type {StudioRecord,StudioMeta,Source,Chapter,TeachingChapter} from './studio-types';
import './studio.css';
import './studio-layout.css';
import './studio-editorial.css';
import './studio-media.css';
import './studio-atlas.css';

const INDEX='mednote-studio-v3:index',ACTIVE='mednote-studio-v3:active';
const key=(id:string)=>'mednote-studio-v3:lecture:'+id;
const bundle=(p:Source)=>({...p,text:(p.text+'\n'+(p.observations||[]).map(o=>o.kind+': '+o.text).join('\n')).slice(0,7000),image:undefined});
export function Studio(){
 const [course,setCourse]=useState<StudioRecord|null>(null),[library,setLibrary]=useState<StudioMeta[]>([]);
 const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [libraryOpen,setLibraryOpen]=useState(false),[progress,setProgress]=useState(0);
 const current=useRef<StudioRecord|null>(null),abort=useRef<AbortController|null>(null),fileRef=useRef<HTMLInputElement>(null);
 const libRef=useRef<StudioMeta[]>([]);
 async function save(next:StudioRecord){
  const record={...next,updated:Date.now()};
  await writeStudy(key(record.id),record);
  current.current=record;setCourse(record);
  const entry:StudioMeta={id:record.id,name:record.name,updated:record.updated,pages:record.sources.length,stage:record.stage};
  const entries=[entry,...libRef.current.filter(x=>x.id!==record.id)].sort((a,b)=>b.updated-a.updated);
  libRef.current=entries;setLibrary(entries);
  await writeStudy(INDEX,entries);
  await writeStudy(ACTIVE,record.id);
 }
 useEffect(()=>{let mounted=true;Promise.all([readStudy<StudioMeta[]>(INDEX),readStudy<string>(ACTIVE)]).then(async([entries,id])=>{
  if(!mounted)return;const rows=Array.isArray(entries)?entries:[];libRef.current=rows;setLibrary(rows);
  if(id){const found=await readStudy<StudioRecord>(key(id));if(mounted&&found){current.current=found;setCourse(found);}}
 }).catch(()=>{if(mounted)setError('تعذر فتح الحفظ المحلي لهذا المتصفح.')}).finally(()=>{if(mounted)setLoaded(true)});
 return()=>{mounted=false;abort.current?.abort();};
 },[]);
 async function run(task:(signal:AbortSignal)=>Promise<void>){
  if(abort.current)return;const controller=new AbortController();abort.current=controller;setError('');
  try{await task(controller.signal);}catch(e){
   if(!(e instanceof DOMException&&e.name==='AbortError')){const message=e instanceof Error?e.message:'تعذرت المعالجة';setError(message);
    if(current.current)await save({...current.current,stage:'failed',error:message}).catch(()=>{});}
  }finally{abort.current=null;setBusy('');}
 }
 async function upload(file:File){
  await run(async signal=>{
   const init:StudioRecord={id:crypto.randomUUID(),name:file.name,created:Date.now(),updated:Date.now(),stage:'extracting',sources:[],chapters:{},selected:0,visionOffset:0};
   await save(init);await writeStudy('mednote-studio-v3:original:'+init.id,file);
   setLibraryOpen(false);setBusy('استخراج شرائح المحاضرة الأصلية…');setProgress(0);
   await ingestLecture(file,signal,async(source,total)=>{
    signal.throwIfAborted();await save({...current.current!,sources:[...current.current!.sources,source]});
    setProgress(Math.round(current.current!.sources.length/total*100));
    setBusy('استخراج الصفحة '+source.page+' من '+total+' وحفظها');
   });
   await analyze(signal);
  });
 }
 async function analyze(signal:AbortSignal){
  let state=current.current;if(!state||!state.sources.length)throw new Error('لا توجد شرائح جاهزة للتحليل.');
  while(state.sources.some(p=>!p.visionDone&&!!p.image)){
   signal.throwIfAborted();const batch=state.sources.filter(p=>!p.visionDone&&p.image).slice(0,3);
   setBusy('فهم الرسومات والجداول · صفحة '+batch[0].page+' إلى '+batch[batch.length-1].page);
   await save({...state,stage:'reading_visuals'});
   const result=await studyRequest('studio',{operation:'vision',pages:batch.map(p=>({page:p.page,text:p.text.slice(0,6000),image:p.image}))},signal);
   const records=result.pages as {page:number;observations:{kind:string;text:string}[];warnings:string[]}[];
   const updated=current.current!.sources.map(p=>{const v=records.find(x=>x.page===p.page);return v?{...p,observations:v.observations,visionDone:true,warnings:[...p.warnings,...v.warnings]}:p;});
   state={...current.current!,sources:updated,stage:'reading_visuals'};
   await save(state);
   setProgress(Math.round(updated.filter(p=>p.visionDone||!p.image).length/updated.length*100));
  }
  signal.throwIfAborted();setBusy('إعادة بناء تسلسل الأفكار العلمية…');setProgress(0);
  await save({...current.current!,stage:'outlining'});
  const res=await studyRequest('studio',{operation:'outline',title:current.current!.name,sources:current.current!.sources.map(bundle)},signal);
  const outline=res as {title:string;chapters:Chapter[];source_count:number};
  await save({...current.current!,outline,stage:'ready',selected:0,error:undefined});
  setBusy('إنشاء أول درس طبي…');await generate(0,signal);
 }
 async function generate(index:number,signal:AbortSignal){
  const state=current.current,chapter=state?.outline?.chapters[index];
  if(!state||!chapter)throw new Error('هذا المفهوم غير موجود.');
  if(state.chapters[index])return;
  setBusy('الأستاذ الذكي يبني '+chapter.title+' ويراجع محتواه العلمي…');
  const ids=new Set(chapter.source_ids),sources=state.sources.filter(p=>ids.has(p.id)).map(bundle);
  const result=await studyRequest('studio',{operation:'lesson',chapter,sources},signal);
  await save({...current.current!,stage:'ready',chapters:{...current.current!.chapters,[index]:(result.lesson as TeachingChapter)}});
 }
 async function go(index:number){
  const state=current.current;if(!state?.outline||index<0||index>=state.outline.chapters.length)return;
  await save({...state,selected:index});
  if(!state.chapters[index])await run(signal=>generate(index,signal));
 }
 async function resume(){await run(async signal=>{
  const state=current.current;if(!state)return;
  if(!state.sources.length){const file=await readStudy<File>('mednote-studio-v3:original:'+state.id);if(!file)throw new Error('ملف المحاضرة الأصلي لم يعد متاحًا.');
   setBusy('إعادة قراءة الملف من آخر نسخة محفوظة…');await ingestLecture(file,signal,async(p,total)=>{
    if(!current.current!.sources.some(x=>x.page===p.page))await save({...current.current!,sources:[...current.current!.sources,p]});setProgress(Math.round(p.page/total*100));
   });
  }
  if(state.outline){await save({...current.current!,stage:'ready',error:undefined});await generate(current.current!.selected,signal);}
  else await analyze(signal);
 });}
 async function openSaved(id:string){
  if(abort.current)return;const next=await readStudy<StudioRecord>(key(id));
  if(next){current.current=next;setCourse(next);await writeStudy(ACTIVE,id);setLibraryOpen(false);setError('');}
 }
 if(!loaded)return <main className="mn3 mn3-loading" role="status">فتح استوديو محاضرات MedNote…</main>;
 return <main className="mn3" dir="rtl">
  <input hidden ref={fileRef} type="file" accept=".pdf,.pptx,.txt,image/*" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/>
  {libraryOpen&&<div className="mn3-library"><h2>مكتبتي</h2>{library.length?library.map(item=><button key={item.id} disabled={!!busy} onClick={()=>void openSaved(item.id)}><FileText size={17}/><span>{item.name}<small>{item.pages} صفحة · {item.stage}</small></span></button>):<p>لا توجد محاضرات محفوظة بعد.</p>}</div>}
  {busy&&<div className="mn3-progress" role="status"><div><b>{busy}</b><small>{progress?progress+'% · ':''}يحفظ التقدم تلقائيًا داخل المتصفح</small></div><button onClick={()=>abort.current?.abort()}>إيقاف</button><div className="mn3-progress-track"><span style={{width:progress+'%'}}/></div></div>}
  {error&&<div role="alert" className="mn3-error"><AlertTriangle size={18}/><span>{error}</span><button disabled={!!busy} onClick={()=>void resume()}><RefreshCw size={16}/> إعادة المحاولة</button></div>}
  {!course&&!busy?<div className="mn3-welcome"><span className="mn3-overline">REIMAGINE THE WAY YOU STUDY</span><div className="mn3-welcome-emblem"><BookOpenText size={55}/></div><h2>ارفعي المحاضرة.<br/>واحصلي على تجربة تعلم جديدة بالكامل.</h2><p>قراءة النصوص والرسومات، ترتيب الأفكار من الصفر، شرح آليات الأمراض، حالات سريرية تفاعلية، واختبارات تفكير — ضمن درس واحد.</p><button className="mn3-primary" onClick={()=>fileRef.current?.click()}><UploadCloud size={20}/> ابدئي برفع PDF أو PowerPoint <ArrowLeft size={17}/></button>{library.length>0&&<button type="button" className="mn3-library-link" onClick={()=>setLibraryOpen(x=>!x)}><Library size={16}/> محاضراتي المحفوظة</button>}<small>حتى 30 MB · تبقى المحاضرة الأصلية محفوظة للرجوع إليها</small></div>:
   course?<StudioCanvas record={course} busy={!!busy} onNew={()=>fileRef.current?.click()} onLibrary={()=>setLibraryOpen(x=>!x)} onGo={i=>void go(i)} onResume={()=>void resume()} onGenerate={()=>void run(signal=>generate(course.selected,signal))}/>:null}
 </main>;
}
