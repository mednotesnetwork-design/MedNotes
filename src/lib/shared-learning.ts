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
export async function findSharedMedia(key:string,signal?:AbortSignal):Promise<SharedMedia[]>{
 if(!/^[a-z0-9_-]{2,80}$/.test(key))return [];
 try{
  const r=await fetch('/api/shared_learning?'+new URLSearchParams({action:'media',concept:key}),{credentials:'same-origin',signal});
  if(!r.ok)return [];
  const result=await r.json() as {media?:SharedMedia[]};
  return Array.isArray(result.media)?result.media.filter(m=>m&&['video','image','interactive3d'].includes(m.kind)&&/^https:\/\//.test(m.url)):[];
 }catch(e){if(signal?.aborted)throw e;return [];}
}
