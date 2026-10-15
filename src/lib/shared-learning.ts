import type {Source,StudioRecord} from '../components/studio/studio-types';

type Snapshot=Pick<StudioRecord,'name'|'sources'|'outline'|'chapters'|'simulations'>;
type SharedResult={match:boolean;snapshot?:Snapshot;review_state?:string;scope?:string};
export type SharedMedia={id:string;title:string;kind:'video'|'image'|'interactive3d';url:string;description:string;version:number};

export async function sha256Bytes(bytes:ArrayBuffer):Promise<string>{
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return [...hash].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function lectureTextDigest(sources:Source[]):Promise<string>{
 // Stable across layout-only changes, but NOT a semantic equivalence claim.
 const canonical=sources.map(p=>String(p.page)+'|'+p.text.normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase()).join('\n');
 return sha256Bytes(new TextEncoder().encode(canonical).buffer as ArrayBuffer);
}
export async function lookupSharedLecture(kind:'file'|'text',digest:string,signal?:AbortSignal):Promise<Snapshot|null>{
 try{
  const args=new URLSearchParams({action:'lecture',digest_kind:kind,digest,scope:'uqu'});
  const r=await fetch('/api/shared_learning?'+args,{credentials:'same-origin',signal});
  if(!r.ok)return null; // Offline, unprovisioned DB or auth: use existing private workflow.
  const value=await r.json() as SharedResult;
  const s=value.snapshot;
  if(value.match!==true||!s||!Array.isArray(s.sources)||!s.sources.length||
    !s.outline||!Array.isArray(s.outline.chapters)||typeof s.chapters!=='object'||!s.chapters)return null;
  const ids=new Set(s.sources.map(p=>p.id));
  if(!s.outline.chapters.every(c=>Array.isArray(c.source_ids)&&c.source_ids.every(id=>ids.has(id))))return null;
  return s;
 }catch(e){
  if(signal?.aborted)throw e;
  return null;
 }
}
export function clinicalConceptKey(text:string):string|null{
 const s=text.toLowerCase();
 if(/\bgout\b|النقرس/.test(s))return 'gout';
 if(/anaphylax|التأق|حساسية مفرطة/.test(s))return 'anaphylaxis';
 if(/\bfracture\b|\bfractured\b|كسر/.test(s))return 'fracture';
 if(/neuromuscular junction|الوصلة العصبية العضلية/.test(s))return 'neuromuscular-junction';
 return null;
}
const mediaCache=new Map<string,{expires:number;media:SharedMedia[]}>();
const mediaPending=new Map<string,Promise<SharedMedia[]>>();
export async function findSharedMedia(key:string,signal?:AbortSignal):Promise<SharedMedia[]>{
 if(!/^[a-z0-9_-]{2,80}$/.test(key))return [];
 if(signal?.aborted)throw signal.reason;
 const cached=mediaCache.get(key);
 if(cached&&cached.expires>Date.now())return cached.media;
 // Coalesce navigation requests. A component abort never cancels another reader.
 let task=mediaPending.get(key);
 if(!task){task=(async()=>{
  try{
   const r=await fetch('/api/shared_learning?'+new URLSearchParams({action:'media',concept:key}),{credentials:'same-origin',signal:AbortSignal.timeout(10000)});
   if(!r.ok)return [];
   const result=await r.json() as {media?:SharedMedia[]};
   const media=Array.isArray(result.media)?result.media.filter(m=>{
    if(!m||!['video','image','interactive3d'].includes(m.kind)||typeof m.url!=='string')return false;
    try{const u=new URL(m.url);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}
   }):[];
   if(mediaCache.size>=64)mediaCache.delete(mediaCache.keys().next().value!);
   mediaCache.set(key,{media,expires:Date.now()+5*60*1000});return media;
  }catch{return []}finally{mediaPending.delete(key)}
 })();mediaPending.set(key,task)}
 const result=await task;if(signal?.aborted)throw signal.reason;return result;
}
