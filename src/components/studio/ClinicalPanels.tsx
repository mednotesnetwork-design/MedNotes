import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,CheckCircle2,Film,VideoOff,Stethoscope} from 'lucide-react';
import type {TeachingChapter} from './studio-types';

export function ClinicalPanel({lesson}:{lesson:TeachingChapter}){
 const [position,setPosition]=useState(0);
 useEffect(()=>setPosition(0),[lesson]);
 const c=lesson.clinical;
 if(!c)return <div className="mn3-empty"><Stethoscope/><p>هذا الموضوع لا يحتوي حالة سريرية موثقة تبرر المحاكاة.</p></div>;
 const shots=c.shots||[],frame=shots[position];
 return <section className="mn3-clinical">
  <div className="mn3-panel-head"><span><Film size={18}/> CLINICAL SIMULATION</span><small>سيناريو مرئي أولي</small></div>
  <div className="mn3-case-stage">
   <div className="mn3-case-meta"><span>EDUCATIONAL SCENARIO</span><span>{position+1} / {Math.max(1,shots.length)}</span></div>
   <div className="mn3-clinical-figure" aria-hidden="true"><span/><i/></div>
   <div className="mn3-case-overlay"><span>{frame?.clinical_cue||c.title}</span><h3>{frame?.description||c.scenario}</h3></div>
  </div>
  {shots.length>1&&<div className="mn3-controls"><button disabled={position===0} onClick={()=>setPosition(n=>n-1)}><ChevronRight size={16}/> السابق</button><span>{position+1} / {shots.length}</span><button disabled={position===shots.length-1} onClick={()=>setPosition(n=>n+1)}>التالي <ChevronLeft size={16}/></button></div>}
  <div className="mn3-reason"><strong>Clinical reasoning</strong><p>{c.reasoning}</p></div>
  <p className="mn3-disclosure"><VideoOff size={15}/> هذا Storyboard وليس فيديو واقعيًا مولدًا. الأعراض قد تختلف بين المرضى.</p>
 </section>;
}

export function QuizPanel({lesson}:{lesson:TeachingChapter}){
 const [answers,setAnswers]=useState<Record<number,number>>({});
 useEffect(()=>setAnswers({}),[lesson]);
 if(!lesson.quiz?.length)return <div className="mn3-empty">لا تتوفر أسئلة تمت مراجعتها لهذا الفصل.</div>;
 return <div className="mn3-quizzes">{lesson.quiz.map((q,i)=><section key={i} className="mn3-quiz">
  <span className="mn3-eyebrow">CHECKPOINT {String(i+1).padStart(2,'0')}</span><h3>{q.question}</h3>
  {q.options.map((o,j)=>{const done=answers[i]!==undefined;return <button key={j} disabled={done} className={done&&j===q.answer_index?'correct':done&&j===answers[i]?'incorrect':''} onClick={()=>setAnswers(a=>({...a,[i]:j}))}><b>{String.fromCharCode(65+j)}</b><span>{o}</span>{done&&j===q.answer_index&&<CheckCircle2 size={17}/>}</button>;})}
  {answers[i]!==undefined&&<div className="mn3-feedback"><strong>{answers[i]===q.answer_index?'إجابة صحيحة':'لنراجع الفكرة'}</strong><p>{q.why[q.answer_index]}</p><details><summary>لماذا لا نختار الإجابات الأخرى؟</summary>{q.options.map((option,j)=>j!==q.answer_index?<p key={j}><strong>{option}: </strong>{q.why[j]}</p>:null)}</details><button onClick={()=>setAnswers(a=>{const n={...a};delete n[i];return n;})}>إعادة المحاولة</button></div>}
 </section>)}</div>;
}
