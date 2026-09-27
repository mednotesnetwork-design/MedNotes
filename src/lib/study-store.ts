const DB='mednote-study-v1';
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('items');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function readStudy<T>(key:string):Promise<T|undefined>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('items');const r=tx.objectStore('items').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
export async function writeStudy(key:string,value:unknown){const db=await open();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('items','readwrite');tx.objectStore('items').put(value,key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
export async function studyRequest(route:string,body:unknown,signal?:AbortSignal){
 const response=await fetch(import.meta.env.BASE_URL+'api/'+route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
 const data=await response.json().catch(()=>({error:'SERVICE_UNAVAILABLE'}));
 if(!response.ok){
  const message=data.error==='GATEWAY_CREDITS_REQUIRED'?'رصيد خدمة AI الاحتياطية غير كافٍ. محتواك وسؤالك محفوظان.':data.error==='GATEWAY_ACCESS_REQUIRED'?'تعذر تفعيل خدمة AI الاحتياطية على الحساب. محتواك وسؤالك محفوظان.':data.error==='PROVIDER_BUSY'?'خدمات AI غير متاحة مؤقتًا بعد تجربة البديل التلقائي. محتواك وسؤالك محفوظان على هذا الجهاز؛ حاولي بعد قليل.':response.status===429?'الخدمة مشغولة الآن. حاولي بعد قليل.':data.error==='LECTURE_REVIEW_FAILED'?'لم يجتز الشرح مراجعة مطابقته للسلايد. جرّبي تحديد مقطع أصغر.':response.status===413?'الجزء المحدد كبير. اختاري مساحة أصغر من السلايد.':'تعذر الاتصال بخدمة AI الآن. محتواك وسؤالك محفوظان؛ حاولي مجددًا.';
  throw new Error(message);
 }
 return data;
}
