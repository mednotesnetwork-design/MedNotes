import { eligibleAsset } from './asset-policy';
import raw from './data/database.json';
import annotations from './data/landmark-annotations.json';
import type { Database, Entity, Muscle, Nerve, Vessel, Movement, ClinicalCase } from './schema';
const sourceDatabase=raw as unknown as Database;
const acceptedAssets=sourceDatabase.assets.filter(eligibleAsset);
const acceptedIds=new Set(acceptedAssets.map(a=>a.id));
export const database:Database={...sourceDatabase,assets:acceptedAssets,entities:sourceDatabase.entities.map(e=>({...e,assetIds:e.assetIds.filter(id=>acceptedIds.has(id))}))};
export const entities = database.entities;
export const byId = new Map(entities.map(e=>[e.id,e]));
export const assets = database.assets;
export const byAsset = new Map(assets.map(a=>[a.id,a]));
export const regions=['Shoulder girdle','Shoulder','Arm','Elbow','Forearm','Wrist','Hand'] as const;
export const systemLabels:Record<string,string>={bone:'Bones',joint:'Joints',landmark:'Landmarks',ligament:'Ligaments',muscle:'Muscles',nerve:'Nerves',artery:'Arteries',vein:'Veins',space:'Spaces',clinical:'Clinical cases',movement:'Movements',surface:'Functional structures'};
export const colors:Record<string,string>={bone:'#E6CFB7',muscle:'#D7AEB3',nerve:'#dec778',artery:'#d57e78',vein:'#83a9c3',ligament:'#d3cdb4',joint:'#8DD3B3',landmark:'#8DD3B3',clinical:'#D7AEB3',movement:'#8DD3B3',surface:'#c3cac1',space:'#8DD3B3'};
export const nameOf=(id:string)=>byId.get(id)?.name??id;
export const muscle=(e:Entity)=>e as Muscle;
export const nerve=(e:Entity)=>e as Nerve;
export const vessel=(e:Entity)=>e as Vessel;
export const movement=(e:Entity)=>e as Movement;
export const clinical=(e:Entity)=>e as ClinicalCase;
const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const index=entities.map(e=>({e,name:normalize(e.name),aliases:normalize(e.aliases.join(' ')),aliasList:[...e.aliases,...(e.system==='muscle'?[muscle(e).abbreviation]:[])].filter(Boolean).map(normalize),body:normalize(e.description+' '+Object.values(e.fields).flat().join(' '))}));
function nearWord(a:string,b:string){
 if(a.length<4||Math.abs(a.length-b.length)>1)return false;
 let previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=row;}
 return previous[b.length]<=1;
}
export function searchAnatomy(query:string,system?:string,region?:string):Entity[]{
 const q=normalize(query),tokens=q.split(' ').filter(Boolean);
 return index.filter(x=>(!system||system==='all'||x.e.system===system)&&(!region||region==='All regions'||x.e.region===region)).map(x=>{
 const text=x.name+' '+x.aliasList.join(' ');
 const score=!q?1:x.name===q?100:x.aliasList.includes(q)?95:x.name.startsWith(q)?85:x.name.includes(q)?75:tokens.every(t=>text.includes(t))?30:nearWord(q,x.name)?25:tokens.every(t=>text.split(' ').some(w=>w===t||nearWord(t,w)))?12:0;
 return {e:x.e,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.e.name.localeCompare(b.e.name)).map(x=>x.e);
}
export function reachable(start:string,direction:'down'|'up'='down',kind?:'nerve'|'artery'|'vein'){
 if(kind==='nerve')return [...traceNerveFibers(start,direction).keys()];
 const visited=new Set<string>();const queue=[start];
 while(queue.length){const id=queue.shift()!;if(visited.has(id))continue;visited.add(id);const e=byId.get(id);if(!e)continue;
  if(kind&&e.system!==kind)continue;
  const n=e as unknown as {branchIds?:string[];parentIds?:string[]};queue.push(...((direction==='down'?n.branchIds:n.parentIds)??[]));
 }
 return [...visited];
}
export function relatedAssetIds(entityId:string):string[]{
 if(entityId==='hand-bones')return assets.filter(a=>a.system==='bone'&&['Wrist','Hand'].includes(a.region)).map(a=>a.id);
 const e=byId.get(entityId);if(!e)return [];
 if(e.assetIds.length)return e.assetIds;
 if(e.system==='landmark')return e.relations.filter(r=>r.type==='landmark of').flatMap(r=>byId.get(r.targetId)?.assetIds??[]);
 if(e.system==='clinical')return [...clinical(e).affectedIds,...clinical(e).lesionIds].flatMap(id=>byId.get(id)?.assetIds??[]);
 if(e.system==='movement')return movement(e).primeMoverIds.flatMap(id=>byId.get(id)?.assetIds??[]);
 if(e.system==='joint'||e.system==='space'||e.system==='nerve')return e.relations.flatMap(r=>byId.get(r.targetId)?.assetIds??[]);
 return [];
}

export function attachmentAssets(id:string,kind:'origin'|'insertion'|'both'='both'){return assets.filter(a=>a.role==='attachment-patch'&&a.review!=='awaiting-review'&&a.muscleIds?.includes(id)&&(kind==='both'||a.attachmentKind===kind));}

/** Trace documented root contributions without letting a cord merge invent fibers. */
export function traceNerveFibers(start:string,direction:'down'|'up'='down'){
 const seed=byId.get(start);const found=new Map<string,Set<string>>();
 if(seed?.system!=='nerve')return found;
 const queue=[{id:start,roots:nerve(seed).rootValues}];
 while(queue.length){const {id,roots}=queue.shift()!;const e=byId.get(id);if(e?.system!=='nerve')continue;
  const n=nerve(e),shared=roots.filter(r=>n.rootValues.includes(r));if(!shared.length)continue;
  const previous=found.get(id)??new Set<string>();const fresh=shared.filter(r=>!previous.has(r));if(!fresh.length)continue;
  fresh.forEach(r=>previous.add(r));found.set(id,previous);
  for(const next of direction==='down'?n.branchIds:n.parentIds)queue.push({id:next,roots:fresh});
 }
 return found;
}

export const landmarkAnnotations=new Map<string,{entityId:string;boneId:string;position:number[]}>(annotations.map(a=>[a.entityId,a]));
