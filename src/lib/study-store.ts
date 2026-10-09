const DB='mednote-study-v1';
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('items');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function readStudy<T>(key:string):Promise<T|undefined>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('items');const r=tx.objectStore('items').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
export async function writeStudy(key:string,value:unknown){const db=await open();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('items','readwrite');tx.objectStore('items').put(value,key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
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
