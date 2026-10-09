import {AlertTriangle,ArrowDown,BookOpenText,ClipboardList,GitBranch,Stethoscope,Table2} from 'lucide-react';
import {References,type OriginalSourceImage} from './ClinicalTeachingLayers';
import type {ClinicalCallout,SourceRegistryItem,TextbookLayout} from './types';

type Props={layouts?:TextbookLayout[];callouts?:ClinicalCallout[];registry?:SourceRegistryItem[];sourceImages?:OriginalSourceImage[];view:'explain'|'visual'};
const kindNames={
 clinical:'Clinical Correlation',
 warning:'Clinical Warning',
 high_yield:'High-Yield Exam Tip'
} as const;
const icons={clinical:Stethoscope,warning:AlertTriangle,high_yield:ClipboardList} as const;

/** Only validated JSON fields become text or native DOM elements. Never evaluate generated markup. */
export function MedicalAtlasLayouts({layouts=[],callouts=[],registry=[],sourceImages=[],view}:Props){
 const evidence=(ids:string[])=><References ids={ids} registry={registry} sourceImages={sourceImages}/>;
 const displayed=layouts.filter(layout=>view==='visual'||layout.kind!=='flowchart');
 if(view==='explain'&&!callouts.length&&!displayed.length)return null;
 if(view==='visual'&&!displayed.length)return null;
 return <div className="medical-atlas-layouts" aria-label="المحتوى الطبي المنظم">
  {view==='explain'&&callouts.map((item,i)=>{
   const Icon=icons[item.kind];
   return <aside key={i} className={'atlas-callout atlas-callout-'+item.kind}>
    <h3><Icon size={18} aria-hidden="true"/>{kindNames[item.kind]}</h3>
    <p dir="auto">{item.text}</p>
    {evidence(item.source_item_ids_used)}
   </aside>;
  })}
  {displayed.map((layout,i)=><section key={i} className={'atlas-structured atlas-'+layout.kind} aria-label={layout.title}>
   <div className="atlas-structured-heading">
    {layout.kind==='comparison_table'?<Table2 size={19} aria-hidden="true"/>:layout.kind==='flowchart'?<GitBranch size={19} aria-hidden="true"/>:<BookOpenText size={19} aria-hidden="true"/>}
    <h3 dir="auto">{layout.title}</h3>
   </div>
   {layout.kind==='comparison_table'?<div className="atlas-table-scroll" role="region" tabIndex={0} aria-label={'جدول: '+layout.title}>
    <table className="atlas-medical-table">
     <thead><tr>{layout.columns.map((name,j)=><th key={j} scope="col" dir="auto">{name}</th>)}</tr></thead>
     <tbody>{layout.rows.map((r,j)=><tr key={j}>
      {r.cells.map((cell,k)=><td key={k} dir="auto">{cell}{k===r.cells.length-1&&evidence(r.source_item_ids_used)}</td>)}
     </tr>)}</tbody>
    </table>
   </div>:<div className={layout.kind==='flowchart'?'atlas-flow-nodes':layout.kind==='tissue_layers'?'atlas-tissue-nodes':'atlas-classification-grid'}>
    {layout.nodes.map((node,j)=><div className="atlas-node-wrap" key={j}>
     <article className="atlas-node">
      <div className="atlas-node-heading">{layout.kind!=='classification_grid'&&<span className="atlas-node-index">{j+1}</span>}<strong dir="auto">{node.label}</strong></div>
      <p dir="auto">{node.detail}</p>{evidence(node.source_item_ids_used)}
     </article>
     {layout.kind==='flowchart'&&j<layout.nodes.length-1&&<ArrowDown className="atlas-flow-arrow" size={21} aria-hidden="true"/>}
    </div>)}
   </div>}
  </section>)}
 </div>;
}
