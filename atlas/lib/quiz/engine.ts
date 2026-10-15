import { entities, byId, nameOf, muscle, clinical } from '@atlas/lib/anatomy';
import { poseIds } from '@atlas/lib/anatomy/demonstrations';
export type QuizKind='identify'|'point'|'origin'|'insertion'|'innervation'|'action'|'lesion'|'deformity'|'fracture';
export type Difficulty='Foundations'|'Intermediate'|'Advanced';
export interface Question{id:string;kind:QuizKind;prompt:string;targetId:string;options:{id:string;label:string}[];correctId:string;explanation:string;contextId:string;poseId?:string;}
export function quizAvailable(kind:QuizKind){if(kind==='deformity')return poseIds.size>=4;if(kind==='point'||kind==='identify')return entities.some(e=>e.system==='bone'&&e.assetIds.length);return true;}
function random<T>(a:T[]){return a[Math.floor(Math.random()*a.length)];}
function shuffle<T>(a:T[]){const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const muscles=entities.filter(e=>e.system==='muscle'&&!e.relations.some(r=>r.type==='part of'));
export function createQuestion(kind:QuizKind,difficulty:Difficulty,previous?:string):Question{
 if(!quizAvailable(kind))throw new Error('This assessment requires eligible 3D anatomy that is not yet available.');
 const uid='q-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
 const choose=(correctId:string,label:string,pool:{id:string;label:string}[])=>shuffle([{id:correctId,label},...shuffle(pool.filter(x=>x.id!==correctId&&x.label!==label).filter((x,i,a)=>a.findIndex(y=>y.label===x.label)===i)).slice(0,3)]);
 if(kind==='identify'||kind==='point'){
  const pool=entities.filter(e=>e.assetIds.length&&['bone','muscle','artery','vein','ligament'].includes(e.system)&&e.id!==previous);
  const filtered=pool.filter(e=>difficulty==='Foundations'?e.system==='bone':difficulty==='Advanced'?['artery','vein','ligament'].includes(e.system):true);
  const e=random(filtered.length?filtered:pool);const peers=entities.filter(p=>p.system===e.system);
  return {id:uid,kind,prompt:kind==='point'?`Select the ${e.name.toLowerCase()} on the 3D model.`:'Identify the highlighted structure.',targetId:e.id,contextId:e.id,options:kind==='point'?[]:choose(e.id,e.name,peers.map(p=>({id:p.id,label:p.name}))),correctId:e.id,explanation:`This is ${e.name.toLowerCase()}. ${e.description||e.fields.Classification||''}`};
 }
 if(['origin','insertion','innervation','action'].includes(kind)){
  const filtered=muscles.filter(m=>m.id!==previous&&(difficulty!=='Foundations'||['Shoulder','Arm'].includes(m.region)));
  const e=random(filtered.length?filtered:muscles),m=muscle(e);
  const answer=(id:string)=>{const mm=muscle(byId.get(id)!);return kind==='origin'?mm.origins.map(x=>x.site).join('; '):kind==='insertion'?mm.insertions.map(x=>x.site).join('; '):kind==='innervation'?mm.nerveIds.map(nameOf).join(' + '):mm.movementIds.map(nameOf).join('; ')||mm.functionalRole;};
  let answerPool=muscles.filter(x=>difficulty!=='Advanced'||x.region===e.region);if(new Set(answerPool.map(x=>answer(x.id))).size<4)answerPool=muscles;
  const label=answer(e.id),field=kind==='innervation'?'nerve supply':kind==='action'?'action pattern':kind;
  return {id:uid,kind,prompt:`Which ${field} belongs to ${e.name.toLowerCase()}?`,targetId:e.assetIds.length?e.id:'',contextId:e.id,options:choose(e.id,label,answerPool.map(x=>({id:x.id,label:answer(x.id)}))),correctId:e.id,explanation:`${e.name}: ${label}. ${m.functionalRole}`};
 }
 const allCases=entities.filter(e=>e.system==='clinical');
 if(kind==='deformity'){
  const cases=allCases.filter(e=>poseIds.has(e.id)&&e.id!==previous&&e.id!=='hand-of-benediction');const c=clinical(random(cases));
  return {id:uid,kind,prompt:'Identify the displayed abnormal bone posture.',targetId:'hand-bones',contextId:c.id,poseId:c.id,options:choose(c.id,c.name,cases.map(e=>({id:e.id,label:e.name}))),correctId:c.id,explanation:c.presentation+' '+c.comparison};
 }
 const cases=allCases.filter(e=>clinical(e).lesionIds.some(id=>byId.get(id)?.system==='nerve')&&(kind==='fracture'?/fracture/.test(e.id):!/fracture/.test(e.id))&&e.id!==previous);const c=clinical(random(cases));
 const answer=c.lesionIds.find(id=>byId.get(id)?.system==='nerve')!;const pool=entities.filter(e=>e.system==='nerve'&&!c.lesionIds.includes(e.id)&&(e as unknown as {course?:string[]}).course?.length).map(e=>({id:e.id,label:e.name}));
 return {id:uid,kind,prompt:kind==='fracture'?`${c.name}: which nerve is classically at risk?`:`${c.presentation} Which nerve or plexus segment is the best fit?`,targetId:c.affectedIds.find(id=>byId.get(id)?.assetIds.length)??'',contextId:c.id,options:choose(answer,nameOf(answer),pool),correctId:answer,explanation:c.mechanism+' '+c.comparison};
}
export function assess(q:Question,answer:string){if(answer===q.correctId)return true;if(q.kind!=='point')return false;const target=new Set(byId.get(q.correctId)?.assetIds??[]),chosen=byId.get(answer)?.assetIds??[];return chosen.length>0&&chosen.every(id=>target.has(id));}
