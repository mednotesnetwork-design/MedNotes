'use strict';
const $=id=>document.getElementById(id);
const fragment=new URLSearchParams(location.hash.slice(1));
if(fragment.has('invite')){sessionStorage.setItem('rm-student-invite',fragment.get('invite'));history.replaceState(null,'',location.pathname);}
let token=sessionStorage.getItem('rm-student-invite');
let turns=[],busy=false;
$('access').textContent=token?'رابط التجربة الخاصة مفعّل.':'افتحي رابط الدعوة الخاص لتفعيل التجربة.';
$('send').disabled=!token;
$('invite-form').hidden=!!token;
$('invite-form').onsubmit=e=>{e.preventDefault();token=$('invite-code').value.trim();if(!token)return;sessionStorage.setItem('rm-student-invite',token);$('invite-code').value='';$('invite-form').hidden=true;$('send').disabled=false;$('access').textContent='رمز التجربة محفوظ لهذه الجلسة.';};
function entry(title,text,kind=''){const a=document.createElement('article');a.className=kind;const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.dir='auto';p.textContent=text;a.append(h,p);$('conversation').append(a);return a;}
$('clear').onclick=()=>{if(busy)return;turns=[];$('conversation').replaceChildren();$('status').textContent='مُسحت المحادثة.';};
$('composer').onsubmit=async e=>{e.preventDefault();if(busy||!token)return;const text=$('input').value.trim();if(!text)return;
 busy=true;$('send').disabled=true;$('clear').disabled=true;$('status').textContent='جارٍ إعداد الرد ومراجعته علميًا… قد يستغرق ذلك بعض الوقت.';
 const mode=$('mode').value;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),290000);
 try{const r=await fetch('/api/student',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},signal:controller.signal,body:JSON.stringify({input:text,mode,research_state:{topic:$('topic').value,research_question:$('question').value,study_design:$('design').value,student_level:$('level').value},conversation:turns.slice(-12)})});
 const data=await r.json();if(!r.ok){if(r.status===401){sessionStorage.removeItem('rm-student-invite');token=null;$('invite-form').hidden=false;}const map={401:'رابط الدعوة غير صالح.',410:'انتهت فترة التجربة.',422:'لم يجتز الرد المراجعة العلمية أو فحص أمانة الترجمة؛ لم يُعرض. نصك محفوظ في المربع.',502:'خدمة النموذج غير متاحة الآن. نصك محفوظ؛ جربي لاحقًا.',503:'خدمة النموذج غير متاحة الآن. نصك محفوظ؛ جربي لاحقًا.'};throw new Error(map[r.status]||'تعذر إكمال الطلب. نصك محفوظ.');}
 if(data.baseline!=='REAL-ENGINE BASELINE V1'||!data.review?.passed)throw new Error('لم يمكن التحقق من هوية الرد ومراجعته.');
 entry('أنتِ',text,'user');entry(data.translation?'الترجمة الأمينة':'Research Mentor · V1',data.translation||data.answer);
 if(data.scientific_warnings?.length)entry('ملاحظات علمية منفصلة عن الترجمة',data.scientific_warnings.join('\n\n'),'warning');
 turns.push({role:'user',content:text},{role:'assistant',content:data.answer});turns=turns.slice(-12);$('input').value='';$('status').textContent='رد تجريبي من V1 — ليس تقييمًا علميًا معتمدًا.';
 }catch(err){$('status').textContent=err.name==='AbortError'?'انتهت مهلة الانتظار. نصك محفوظ.':err.message;}finally{clearTimeout(timer);busy=false;$('send').disabled=!token;$('clear').disabled=false;}
};
