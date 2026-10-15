import { entities,assets,byId,muscle,nerve,traceNerveFibers,reachable } from './index';
import type { Attachment,Muscle } from './schema';
export type BoneMode='overview'|'landmarks'|'attachments'|'ligaments'|'joints'|'neurovascular'|'clinical';
export function boneLandmarks(boneId:string){return entities.filter(e=>e.system==='landmark'&&e.relations.some(r=>r.type==='landmark of'&&r.targetId===boneId));}
export function boneAttachments(boneId:string){
 const result:{muscle:Muscle;attachment:Attachment;kind:'origin'|'insertion'}[]=[];
 for(const e of entities.filter(e=>e.system==='muscle'))for(const kind of ['origin','insertion'] as const)for(const a of muscle(e)[kind==='origin'?'origins':'insertions'])if(a.boneIds.includes(boneId))result.push({muscle:muscle(e),attachment:a,kind});
 return result;
}
/** Stable anatomical categories, not a random palette or invented surface segmentation. */
export function landmarkFamily(name:string){
 if(/tuberc|tuberos|epicond|crest|\bspine\b|process|acromion|\bline\b/i.test(name))return {label:'Projection or ridge',color:'#E6CFB7'};
 if(/fossa|groove|sulcus|notch/i.test(name))return {label:'Fossa, groove or notch',color:'#83a9c3'};
 if(/\bhead\b|glenoid cavity|capitulum|\btrochlea\b|facet|articular/i.test(name))return {label:'Articular region',color:'#8DD3B3'};
 return {label:'Border, angle or segment',color:'#D7AEB3'};
}
export function bonePatches(id:string,kind:'origin'|'insertion'|'both'='both'){return assets.filter(a=>a.role==='attachment-patch'&&a.review!=='awaiting-review'&&a.boneId===id&&(kind==='both'||a.attachmentKind===kind));}
export function tracedIds(id:string,direction:'up'|'down'|'both'){
 const e=byId.get(id);if(!e||!['nerve','artery','vein'].includes(e.system))return [];
 const kind=e.system as 'nerve'|'artery'|'vein';return [...new Set((direction==='both'?['up','down'] as const:[direction]).flatMap(d=>reachable(id,d,kind)))];
}
export function nerveTargets(id:string){const trace=traceNerveFibers(id,'down');return [...new Set([...trace.keys()].flatMap(n=>{const e=byId.get(n)!;return nerve(e).motorIds.filter(m=>muscle(byId.get(m)!).rootValues.some(r=>trace.get(n)?.has(r)));}))];}

export function boneRelations(boneId:string,systems:string[]){
 const context=new Set([boneId,...boneLandmarks(boneId).map(e=>e.id)]);
 return entities.filter(e=>systems.includes(e.system)&&(e.relations.some(r=>context.has(r.targetId))||byId.get(boneId)?.relations.some(r=>r.targetId===e.id)));
}
