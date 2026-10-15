/** Durable lecture job API. No provider keys or database secrets on the client. */
export type LectureJobHandle={job_id:string;job_token:string};
export type JobSnapshot={
 job_id:string;title:string;total_pages:number;phase:'queued'|'extracting'|'structuring'|'generating'|'retrying'|'failed'|'ready';
 processed_pages:number;plan_offset:number;plan?:unknown;lessons?:Record<string,unknown>;
 warnings?:string[];error_code?:string;attempts:number;
 pages?:Array<{number:number;points?:unknown[];warnings?:string[]}>;
};
const endpoint=(action:string,id?:string)=>{
 const params=new URLSearchParams({action});
 if(id)params.set('id',id);
 return import.meta.env.BASE_URL+'api/lecture_jobs?'+params.toString();
};
async function call(action:string,method:'GET'|'POST',body?:unknown,handle?:LectureJobHandle,signal?:AbortSignal){
 const response=await fetch(endpoint(action,method==='GET'?handle?.job_id:undefined),{
  method,credentials:'same-origin',signal,
  headers:{...(body?{'Content-Type':'application/json'}:{}),
   ...(handle?{'X-MedNote-Job-Token':handle.job_token}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const data=await response.json().catch(()=>({error:'JOB_SERVICE_UNAVAILABLE'}));
 if(!response.ok){
  const e=new Error(String(data.error||'JOB_SERVICE_UNAVAILABLE')) as Error&{status:number;code:string};
  e.status=response.status;e.code=String(data.error||'JOB_SERVICE_UNAVAILABLE');throw e;
 }
 return data;
}
export const createLectureJob=(title:string,total_pages:number,signal?:AbortSignal)=>
 call('create','POST',{title,total_pages},undefined,signal) as Promise<LectureJobHandle>;
export const appendLecturePage=(handle:LectureJobHandle,page:{number:number;text:string;image?:string},signal?:AbortSignal)=>
 call('page','POST',{job_id:handle.job_id,page},handle,signal);
export const startLectureJob=(handle:LectureJobHandle,signal?:AbortSignal)=>
 call('start','POST',{job_id:handle.job_id},handle,signal);
export const getLectureJob=(handle:LectureJobHandle,signal?:AbortSignal)=>
 call('status','GET',undefined,handle,signal) as Promise<JobSnapshot>;
