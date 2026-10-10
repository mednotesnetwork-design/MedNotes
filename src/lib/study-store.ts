const DB='mednote-study-v1';
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('items');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function readStudy<T>(key:string):Promise<T|undefined>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('items');const r=tx.objectStore('items').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
export async function writeStudy(key:string,value:unknown){const db=await open();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('items','readwrite');tx.objectStore('items').put(value,key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
export async function deleteStudy(key:string):Promise<void>{
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('items','readwrite');
  tx.objectStore('items').delete(key);
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onerror=()=>{db.close();reject(tx.error);};
  tx.onabort=()=>{db.close();reject(tx.error||new Error('Storage deletion failed'));};
 });
}
export type SavedLectureMeta={id:string;name:string;updatedAt:number;pages:number;ready:boolean};
const LIBRARY='lecture-library-v1',ACTIVE='lecture-course-v2:active';
export const lectureKey=(id:string)=>'lecture-course-v2:item:'+id;
export async function listSavedLectures():Promise<SavedLectureMeta[]>{
 const entries=await readStudy<SavedLectureMeta[]>(LIBRARY);
 return (Array.isArray(entries)?entries:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string')
  .sort((a,b)=>b.updatedAt-a.updatedAt);
}
export async function saveLectureRecord<T extends {id?:string;name:string;pages:unknown[];phase?:string}>(value:T):Promise<T&{id:string}>{
 const id=value.id||crypto.randomUUID(),saved={...value,id};
 // Persist the full lesson FIRST, then the index and the active pointer.
 // An interrupted metadata transaction must not orphan the content.
 await writeStudy(lectureKey(id),saved);
 const entries=await listSavedLectures();
 const row:SavedLectureMeta={id,name:value.name||'محاضرة بدون عنوان',updatedAt:Date.now(),
  pages:value.pages.length,ready:value.phase==='ready'};
 await writeStudy(LIBRARY,[row,...entries.filter(x=>x.id!==id)]);
 await writeStudy(ACTIVE,id);
 return saved;
}
export async function loadActiveLecture<T extends {id?:string;name:string;pages:unknown[]}>():Promise<T|undefined>{
 const active=await readStudy<string>(ACTIVE);
 if(active){const saved=await readStudy<T>(lectureKey(active));if(saved)return saved;}
 // Upgrade the prior single-lecture format without deleting its data first.
 const legacy=await readStudy<T>('lecture-course-v2');
 if(legacy&&typeof legacy.name==='string'&&Array.isArray(legacy.pages)){
  const saved=await saveLectureRecord(legacy);
  await deleteStudy('lecture-course-v2').catch(()=>{});
  return saved;
 }
 return undefined;
}
export async function saveLectureOriginal(id:string,file:File):Promise<void>{
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(id))throw new Error('Invalid lecture ID');
 await writeStudy('lecture-original:'+id,file);
}
export async function loadLectureOriginal(id:string):Promise<Blob|undefined>{
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(id))return undefined;
 return readStudy<Blob>('lecture-original:'+id);
}
export async function loadSavedLecture<T>(id:string):Promise<T|undefined>{
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(id))return undefined;
 const saved=await readStudy<T>(lectureKey(id));
 if(saved)await writeStudy(ACTIVE,id);
 return saved;
}
export async function studyRequest(route:string,body:unknown,signal?:AbortSignal){
 const response=await fetch(import.meta.env.BASE_URL+'api/'+route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
 const data=await response.json().catch(()=>({error:'SERVICE_UNAVAILABLE'}));
 if(!response.ok){
  const message=data.error==='STUDY_TIMEOUT'?'استغرق الشرح وقتًا أطول من المتوقع. محتواك محفوظ؛ حاولي مجددًا.':data.error==='STUDY_CONFIGURATION_REQUIRED'?'خدمة الشرح غير جاهزة حاليًا. محتواك محفوظ؛ نعمل على استعادة الاتصال.':data.error==='PROVIDER_BUSY'?'خدمة الشرح مشغولة مؤقتًا. محتواك محفوظ؛ حاولي بعد قليل.':response.status===429?'وصلتِ إلى حد الاستخدام المؤقت. محتواك محفوظ؛ حاولي مجددًا بعد قليل.':data.error==='COURSE_PLAN_FAILED'?'تعذر التحقق من اكتمال خريطة المحاضرة. النقاط المستخرجة محفوظة، ويمكن استكمال التنظيم.':data.error==='COURSE_EXTRACTION_FAILED'?'بعض أجزاء الرسومات لم تُقرأ بصورة موثوقة؛ راجعي وضوح الصفحة ثم أعيدي المحاولة.':data.error==='PROVIDER_FAILURE'?'رد Gemini غير مكتمل أو غير صالح للقراءة. لم تُنشر معلومات غير مراجعة؛ أعيدي المحاولة.':data.error==='PREVIEW_IDENTITY_UNAVAILABLE'?'هوية المعاينة في Vercel غير متاحة للخادم. تحتاج إعدادات التشغيل إلى مراجعة.':data.error==='LECTURE_REVIEW_FAILED'?'تعذر إعداد شرح موثوق لهذا السلايد بعد مراجعته. حاولي سؤالًا محددًا أو صورة أوضح.':response.status===413?'حجم السلايد كبير. اختاري صورة أصغر.':'تعذر الاتصال بخدمة الشرح الآن. محتواك وسؤالك محفوظان؛ حاولي مجددًا.';
  const failure=new Error(message) as Error&{code:string;status:number};
  failure.code=String(data.error||'SERVICE_UNAVAILABLE');
  failure.status=response.status;
  throw failure;
 }
 return data;
}
