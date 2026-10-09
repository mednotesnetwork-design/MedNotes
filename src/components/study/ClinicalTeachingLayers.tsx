import {useState} from 'react';
import {BookOpenCheck,Activity,Stethoscope,ScanEye} from 'lucide-react';
import type {ClinicalLayers,SourceRegistryItem} from './types';

export type OriginalSourceImage={page:number;image?:string};
type Props={
 layers:ClinicalLayers;
 registry?:SourceRegistryItem[];
 sourceImages?:OriginalSourceImage[];
 view:'explain'|'visual';
};
export function References({ids,registry=[],sourceImages=[]}:{ids:string[];registry?:SourceRegistryItem[];sourceImages?:OriginalSourceImage[]}){
 const [opened,setOpened]=useState<string|null>(null);
 if(!ids.length)return null;
 return <div className="clinical-source-links" aria-label="مراجع السلايد الأصلي">
  {ids.map(id=>{
   const item=registry.find(p=>p.item_id===id);
   const image=sourceImages.find(p=>p.page===item?.page_number)?.image;
   const shown=opened===id;
   return <div key={id} className="clinical-source-link">
    <button type="button" disabled={!image} aria-expanded={shown} onClick={()=>setOpened(shown?null:id)} aria-label={item?.page_number? `المصدر صفحة ${item.page_number}، عنصر ${id}`:`المصدر ${id}`}>
     {item?.page_number?`صفحة ${item.page_number}`:'المصدر'} · <span dir="ltr">{id}</span>{image?' ◂':''}
    </button>
    {shown&&image&&<div className="clinical-source-image" aria-label={`الصفحة الأصلية ${item?.page_number}`}>
     <img src={image} alt={`صورة الصفحة الأصلية رقم ${item?.page_number}`} loading="lazy"/>
     {item?.bbox&&item.bbox.length===4&&
       <span className="clinical-source-bbox" aria-label={`موضع العنصر ${id} في الصفحة`}
        style={{left:`${item.bbox[0]*100}%`,top:`${item.bbox[1]*100}%`,
          width:`${item.bbox[2]*100}%`,height:`${item.bbox[3]*100}%`}}/>}
    </div>}
   </div>;
  })}
 </div>;
}
/** The page references and bounding boxes are server-owned; none originate from the AI lesson prose. */
export function ClinicalTeachingLayers({layers,registry=[],sourceImages=[],view}:Props){
 const refs=(ids:string[])=><References ids={ids} registry={registry} sourceImages={sourceImages}/>;
 if(view==='visual')return <section className="clinical-layers clinical-layers-visual" aria-label="ربط العناصر البصرية بمصادرها">
  <h3><ScanEye size={19} aria-hidden="true"/> Visual Cue Mapping · خريطة الرسومات</h3>
  {!layers.visual_cues.length?<p className="clinical-layer-empty">لا توجد تفاصيل بصرية موثقة يمكن ربطها بهذه الفكرة؛ لا نعرض رسومات افتراضية كأنها من المحاضرة.</p>:null}
  {layers.visual_cues.map((cue,i)=><article key={i} className="clinical-visual-cue">
    <strong>{cue.label}</strong><p dir="auto">{cue.detail}</p>{refs(cue.source_item_ids_used)}
  </article>)}
 </section>;
 const steps=layers.mechanism?.steps||[];
 return <section className="clinical-layers" aria-label="الشرح السريري المتدرج">
  <article className="clinical-layer">
   <h3><BookOpenCheck size={19} aria-hidden="true"/> Core Concept · الفكرة الجوهرية</h3>
   <p dir="auto" className="clinical-layer-core">{layers.core_concept.text}</p>
   {refs(layers.core_concept.source_item_ids_used)}
  </article>
  <article className="clinical-layer">
   <h3><Activity size={19} aria-hidden="true"/> Mechanism / Pathophysiology · الآلية</h3>
   {steps.length?<ol className="clinical-mechanism-steps">{steps.map((step,i)=><li key={i}>
    <span className="clinical-step-number">{i+1}</span>
    <div><p dir="auto">{step.text}</p>{refs(step.source_item_ids_used)}</div>
   </li>)}</ol>:<p className="clinical-layer-empty">المحاضرة لا تحدد سلسلة آلية كافية لهذا الجزء؛ لن نفترض خطوات غير مذكورة.</p>}
  </article>
  <article className="clinical-layer">
   <h3><Stethoscope size={19} aria-hidden="true"/> Clinical Correlation · الربط السريري</h3>
   {layers.clinical_correlation.text?<><p dir="auto">{layers.clinical_correlation.text}</p>{refs(layers.clinical_correlation.source_item_ids_used)}</>:
    <p className="clinical-layer-empty">لم تُذكر علاقة سريرية صريحة في مصادر هذا السلايد.</p>}
  </article>
 </section>;
}
