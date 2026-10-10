import {AlertTriangle,ArrowLeft,ArrowDown,BookOpenText,ClipboardList,GitBranch,Network,Stethoscope,Table2} from 'lucide-react';
import {References,type OriginalSourceImage} from './ClinicalTeachingLayers';
import type {ClinicalCallout,SourceRegistryItem,TextbookLayout} from './types';

type Props={layouts?:TextbookLayout[];callouts?:ClinicalCallout[];registry?:SourceRegistryItem[];sourceImages?:OriginalSourceImage[];view:'explain'|'visual'};
type AtlasNode={label:string;detail:string;source_item_ids_used:string[]};
const kindNames={clinical:'CLINICAL CORRELATION',warning:'PATHOLOGIC CHANGE / CAUTION',high_yield:'HIGH-YIELD / EXAM PEARL'} as const;
const icons={clinical:Stethoscope,warning:AlertTriangle,high_yield:ClipboardList} as const;
const categoryTitles:Record<TextbookLayout['kind'],string>={
 comparison_table:'COMPARISON / EVIDENCE TABLE',
 classification_grid:'STRUCTURE / CLASSIFICATION',
 radial_map:'RADIAL CONCEPT MAP',
 hierarchy_tree:'CLASSIFICATION / HIERARCHY',
 comparison_map:'CONTRAST / TWO BRANCHES',
 tissue_layers:'ANATOMICAL LAYERS',
 flowchart:'CAUSE → MECHANISM → EFFECT'
};
function EditorialNode({node,index,refs,tone='teal'}:{node:AtlasNode;index?:number;refs:(ids:string[])=>React.ReactNode;tone?:string}){
 return <article className={'atlas-editorial-node atlas-tone-'+tone} dir="auto">
  <div className="atlas-editorial-node-title">{index!==undefined&&<span className="atlas-editorial-number">{String(index+1).padStart(2,'0')}</span>}<strong>{node.label}</strong></div>
  <p>{node.detail}</p>{refs(node.source_item_ids_used)}
 </article>;
}
/** The connecting curves are decorative geometry, not AI-generated coordinates or claims. */
function RadialMap({title,nodes,refs}:{title:string;nodes:AtlasNode[];refs:(ids:string[])=>React.ReactNode}){
 // More than four branches use the accessible hierarchy grid instead of overlapping.
 if(nodes.length>4)return <HierarchyTree title={title} nodes={nodes} refs={refs}/>;
 return <div className="atlas-radial-map" aria-label={'خريطة ذهنية: '+title}>
  <svg className="atlas-radial-links" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">
   <path d="M500 210 C370 210 380 100 215 100 M500 210 C630 210 620 100 785 100 M500 210 C370 210 380 330 215 330 M500 210 C630 210 620 330 785 330" fill="none" stroke="#9ba9a2" strokeWidth="2"/>
  </svg>
  <div className="atlas-radial-hub" dir="auto"><strong>{title}</strong></div>
  {nodes.map((node,i)=><div key={i} className={'atlas-radial-branch atlas-radial-branch-'+i}>
   <EditorialNode node={node} refs={refs} tone={['teal','gold','lavender','rose'][i]}/>
  </div>)}
 </div>;
}
function HierarchyTree({title,nodes,refs}:{title:string;nodes:AtlasNode[];refs:(ids:string[])=>React.ReactNode}){
 return <div className="atlas-hierarchy-tree atlas-classification-grid" aria-label={'شجرة التفرعات: '+title}>
  <div className="atlas-tree-hub" dir="auto">{title}</div>
  <div className="atlas-tree-stem" aria-hidden="true"/>
  <div className="atlas-tree-branches">{nodes.map((node,i)=><div className="atlas-tree-column" key={i}>
    <span className="atlas-tree-connector" aria-hidden="true"/>
    <EditorialNode node={node} refs={refs} tone={i%3===0?'teal':i%3===1?'rose':'gold'}/>
   </div>)}</div>
 </div>;
}
function ProcessFlow({nodes,refs}:{nodes:AtlasNode[];refs:(ids:string[])=>React.ReactNode}){
 return <div className="atlas-flow-nodes" aria-label="التسلسل السببي">
  {nodes.map((node,i)=><div className="atlas-flow-stage" key={i}>
   <div className="atlas-node-wrap"><EditorialNode node={node} index={i} refs={refs} tone="gold"/></div>
   {i<nodes.length-1&&<ArrowLeft className="atlas-flow-arrow" size={21} aria-hidden="true"/>}
  </div>)}
 </div>;
}
function ContrastMap({title,nodes,refs}:{title:string;nodes:AtlasNode[];refs:(ids:string[])=>React.ReactNode}){
 return <div className="atlas-contrast-map" aria-label={'خريطة مقارنة: '+title}>
  <div className="atlas-tree-hub" dir="auto">{title}</div><div className="atlas-tree-stem" aria-hidden="true"/>
  <div className="atlas-contrast-sides">{nodes.map((node,i)=><div key={i} className="atlas-contrast-side">
   <span className="atlas-tree-connector" aria-hidden="true"/>
   <EditorialNode node={node} refs={refs} tone={i%2?'rose':'teal'}/>
  </div>)}</div>
 </div>;
}
function TissueLayers({nodes,refs}:{nodes:AtlasNode[];refs:(ids:string[])=>React.ReactNode}){
 return <div className="atlas-tissue-nodes" aria-label="الطبقات من الأعلى إلى الأسفل">
  {nodes.map((node,i)=><div className="atlas-node-wrap" key={i}>
   <span className="atlas-tissue-index">{String(i+1).padStart(2,'0')}</span>
   <EditorialNode node={node} refs={refs} tone={i%2?'gold':'teal'}/>
  </div>)}
 </div>;
}
/** Only validated medical JSON becomes DOM text; no HTML, external URLs or executable SVG from Gemini. */
export function MedicalAtlasLayouts({layouts=[],callouts=[],registry=[],sourceImages=[],view}:Props){
 const refs=(ids:string[])=><References ids={ids} registry={registry} sourceImages={sourceImages}/>;
 if(!layouts.length&&(!callouts.length||view==='visual'))return null;
 return <div className="medical-atlas-layouts atlas-editorial" aria-label="الأطلس الطبي المصور">
  <div className="atlas-editorial-topline"><span>MEDICAL NOTES / VISUAL LEARNING</span><span>EDITORIAL ATLAS</span></div>
  {layouts.map((layout,i)=><section key={i} className={'atlas-structured atlas-'+layout.kind} aria-label={layout.title}>
   <div className="atlas-structured-heading">
    <div className="atlas-structured-eyebrow"><span>{String(i+1).padStart(2,'0')} / {categoryTitles[layout.kind]}</span><span>VISUAL SCHEMA</span></div>
    <div className="atlas-section-title">{layout.kind==='comparison_table'?<Table2 size={20}/>:layout.kind==='flowchart'?<GitBranch size={20}/>:<Network size={20}/>}<h3 dir="auto">{layout.title}</h3></div>
   </div>
   {layout.kind==='comparison_table'?
    <div className="atlas-table-scroll" role="region" tabIndex={0} aria-label={'جدول: '+layout.title}>
     <table className="atlas-medical-table">
      <thead><tr>{layout.columns.map((name,j)=><th key={j} scope="col" dir="auto">{name}</th>)}</tr></thead>
      <tbody>{layout.rows.map((r,j)=><tr key={j}>{r.cells.map((cell,k)=><td key={k} dir="auto">{cell}{k===r.cells.length-1&&refs(r.source_item_ids_used)}</td>)}</tr>)}</tbody>
     </table>
    </div>:
    layout.kind==='flowchart'?<ProcessFlow nodes={layout.nodes} refs={refs}/>:
    layout.kind==='radial_map'?<RadialMap title={layout.title} nodes={layout.nodes} refs={refs}/>:
    layout.kind==='comparison_map'?<ContrastMap title={layout.title} nodes={layout.nodes} refs={refs}/>:
    layout.kind==='tissue_layers'?<TissueLayers nodes={layout.nodes} refs={refs}/>:
    <HierarchyTree title={layout.title} nodes={layout.nodes} refs={refs}/>
   }
   <p className="atlas-figure-caption"><BookOpenText size={13}/> FIGURE {i+1} · Schematic learning figure. Source references appear with each element.</p>
  </section>)}
  {view==='explain'&&callouts.length>0&&<div className="atlas-editorial-callouts">{callouts.map((item,i)=>{
   const Icon=icons[item.kind];
   return <aside key={i} className={'atlas-callout atlas-callout-'+item.kind}>
    <h3><Icon size={16} aria-hidden="true"/>{kindNames[item.kind]}</h3><p dir="auto">{item.text}</p>
    {refs(item.source_item_ids_used)}
   </aside>;
  })}</div>}
  <div className="atlas-editorial-bottomline">MEDICAL NOTES / SOURCE-GROUNDED DIAGRAMS <span>NOT TO SCALE</span></div>
 </div>;
}
