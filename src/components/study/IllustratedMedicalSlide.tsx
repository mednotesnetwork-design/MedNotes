import {useState} from 'react';
import {BookOpen,ImageOff,Lightbulb,Maximize2} from 'lucide-react';
import {References,type OriginalSourceImage} from './ClinicalTeachingLayers';
import type {Explanation} from './types';

type Props={lesson:Explanation;slide:string;sourceImages?:OriginalSourceImage[];compact?:boolean};
type CuratedFigure={src:string;title:string;credit:string;license:string;licenseUrl:string;pageUrl:string};
const NMJ_FIGURE:CuratedFigure={
 src:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Neuro_Muscular_Junction.png/1280px-Neuro_Muscular_Junction.png',
 title:'Neuromuscular junction — motor neuron and muscle fibre',
 credit:'Doctor Jana / DrJanaOfficial, Wikimedia Commons',
 license:'CC BY 4.0',
 licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
 pageUrl:'https://commons.wikimedia.org/wiki/File:Neuro_Muscular_Junction.png'
};
const NEURON_FIGURE:CuratedFigure={
 src:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Neuron_-_Nerve_Cell_01.png/1280px-Neuron_-_Nerve_Cell_01.png',
 title:'Multipolar neuron — cell body, dendrites and axon',
 credit:'Doctor Jana / DrJanaOfficial, Wikimedia Commons',
 license:'CC BY 4.0',
 licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
 pageUrl:'https://commons.wikimedia.org/wiki/File:Neuron_-_Nerve_Cell_01.png'
};
export function findTeachingFigure(source:string):CuratedFigure|undefined{
 // Only use a curated medical figure when the current source identifies the
 // corresponding anatomy; never assume that another synapse is an NMJ.

 if(/neuromuscular junction|neuromuscular transmission|\bNMJ\b|الوصلة العصبية العضلية|المشبك العصبي العضلي/i.test(source))return NMJ_FIGURE;
 if(/(?:\bneuron\b|\bneurons\b|عصبون|الخلية العصبية|خلايا عصبية)/i.test(source)
   &&/axon|dendrit|soma|myelin|cell body|المحور|الزوائد الشجرية|جسم الخلية|ميالين/i.test(source))return NEURON_FIGURE;
 return undefined;
}
function availableSteps(lesson:Explanation){
 const intro=lesson.clinical_layers?.core_concept?.text||lesson.explanation||'';
 const steps=[{title:'الفكرة الأساسية',body:intro,refs:lesson.clinical_layers?.core_concept.source_item_ids_used||[]}];
 if(lesson.clinical_layers?.mechanism.steps?.length){
  steps.push(...lesson.clinical_layers.mechanism.steps.map((step,index)=>({
   title:'Step '+(index+1),body:step.text,refs:step.source_item_ids_used
  })));
 }else{
  steps.push(...(lesson.mechanism||[]).map(step=>({title:step.label,
   body:step.detail||step.source_quote,refs:[] as string[]})));
 }
 return steps.filter(step=>step.body.trim()).slice(0,14);
}
/**
 * A medical textbook figure is the primary canvas. The explanation tracks
 * individually reviewed mechanism steps alongside it. Images are either
 * licensed real figures or explicitly identified source-PDF pages: never
 * fake generated figures, patient videos or unsupported image coordinates.
 */
export function IllustratedMedicalSlide({lesson,slide,sourceImages=[]}:Props){
 const [step,setStep]=useState(0);
 const [showOriginal,setShowOriginal]=useState(false);
 const [failed,setFailed]=useState(false);
 const [zoom,setZoom]=useState(false);
 const curated=findTeachingFigure(slide+' '+lesson.explanation);
 const evidencePages=new Set((lesson.source_registry||[]).map(p=>p.page_number));
 const imageFromLecture=sourceImages.find(p=>p.image&&evidencePages.has(p.page))||
  sourceImages.find(p=>p.image);
 const original=!!imageFromLecture?.image;
 if(!curated&&!original)return null;
 const useSource=(showOriginal||failed)&&original||!curated;
 const url=failed&&!original?undefined:useSource?imageFromLecture?.image:curated?.src;
 const phases=availableSteps(lesson);
 const active=phases[Math.min(step,Math.max(0,phases.length-1))];
 const sourceAttribution=useSource?'Original uploaded lecture · Page '+imageFromLecture?.page:
  'External licensed anatomy illustration · Not from the uploaded lecture';
 return <section className="medplate" aria-label="لوحة شرح طبي مرئية" dir="rtl">
  <header className="medplate-header">
   <div className="medplate-heading">
    <span className="medplate-kicker">MEDNOTE / MEDICAL TEACHING PLATE</span>
    <h3>من الفكرة إلى الآلية — شرح بصري خطوة بخطوة</h3>
    <p>اختاري أي مرحلة؛ يظهر تفسيرها بجانب الرسم الطبي وليس في مربعات بعيدة عنه.</p>
   </div>
   <span className="medplate-counter" dir="ltr">{phases.length} TEACHING STEPS</span>
  </header>
  <div className="medplate-timeline" role="group" aria-label="المراحل التعليمية">
   {phases.map((item,index)=><button type="button" key={index} onClick={()=>setStep(index)}
    aria-pressed={index===Math.min(step,phases.length-1)} className="medplate-phase">
    <span>{index+1}</span><strong dir="auto">{item.title}</strong>
   </button>)}
  </div>
  <div className="medplate-body">
   <figure className="medplate-figure">
    <div className="medplate-figure-tools">
     <span>FIGURE / {useSource?'ORIGINAL LECTURE':'CURATED MEDICAL ILLUSTRATION'}</span>
     <div>
      {curated&&original&&<button type="button" onClick={()=>{setShowOriginal(v=>!v);setFailed(false);}} aria-label={useSource?'عرض الرسم الطبي':'عرض الصورة الأصلية'}>
       <BookOpen size={15}/>{useSource?'رسم طبي':'المحاضرة الأصلية'}</button>}
      <button type="button" onClick={()=>setZoom(true)} disabled={!url} aria-label="تكبير الرسم الطبي"><Maximize2 size={17}/></button>
     </div>
    </div>
    {url?<img key={url} src={url} alt={useSource?'صفحة '+imageFromLecture?.page+' من المحاضرة الأصلية':curated?.title}
     loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:
     <div className="medplate-missing"><ImageOff size={28}/><p>لم تُحمّل صورة طبية موثوقة لهذه الفكرة. التفاصيل النصية ومصادرها ما زالت متاحة.</p></div>}
    <figcaption>{sourceAttribution}
     {!useSource&&curated&&<> · <a target="_blank" rel="noopener noreferrer" href={curated.pageUrl}>{curated.credit}</a> · <a target="_blank" rel="noopener noreferrer" href={curated.licenseUrl}>{curated.license}</a></>}
    </figcaption>
   </figure>
   <div className="medplate-explanation">
    <div className="medplate-step-heading">
     <span>{String(Math.min(step,Math.max(0,phases.length-1))+1).padStart(2,'0')}</span>
     <h4 dir="auto">{active?.title||'الفكرة الجوهرية'}</h4>
    </div>
    <p className="medplate-step-copy" dir="auto">{active?.body||lesson.explanation}</p>
    {!!active?.refs?.length&&<div className="medplate-evidence">
     <span>المصدر الأصلي</span>
     <References ids={active.refs} registry={lesson.source_registry} sourceImages={sourceImages}/>
    </div>}
    {step===0&&!!lesson.high_yield?.length&&<div className="medplate-takeaway">
     <Lightbulb size={19}/><div><strong>Key takeaway</strong><p dir="auto">{lesson.high_yield[0]}</p></div>
    </div>}
    {lesson.clinical_connection?.text&&<div className="medplate-clinical">
     <strong>Clinical correlation</strong><p dir="auto">{lesson.clinical_connection.text}</p>
    </div>}
    <div className="medplate-step-nav">
     <button type="button" disabled={step===0} onClick={()=>setStep(p=>p-1)}>السابق</button>
     <span dir="ltr">{Math.min(step+1,phases.length)} / {phases.length}</span>
     <button type="button" disabled={step===phases.length-1} onClick={()=>setStep(p=>p+1)}>التالي</button>
    </div>
   </div>
  </div>
  {lesson.opening?.kind==='case'&&lesson.opening.scene&&<aside className="medplate-case">
   <span>CLINICAL REASONING · CASE SCENARIO (TEXT)</span><p dir="auto">{lesson.opening.scene}</p>
   <strong dir="auto">{lesson.opening.prompt}</strong>
   <small>حالة مكتوبة من المحتوى المراجع، وليست فيديو سريريًا مولّدًا.</small>
  </aside>}
  {zoom&&url&&<div className="medplate-zoom-overlay" role="dialog" aria-modal="true" aria-label="عرض الرسم الطبي بحجم كبير" onClick={()=>setZoom(false)}>
   <button type="button" onClick={()=>setZoom(false)} aria-label="إغلاق تكبير الرسم">إغلاق ×</button>
   <img src={url} alt={useSource?'الصورة الأصلية من المحاضرة':curated?.title} onClick={e=>e.stopPropagation()}/>
  </div>}
 </section>;
}
