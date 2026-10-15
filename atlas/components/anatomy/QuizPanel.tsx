'use client';
import { useState,useEffect,useImperativeHandle,type Ref } from 'react';
import { createQuestion,assess,quizAvailable,type Question,type QuizKind,type Difficulty } from '@atlas/lib/quiz/engine';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@atlas/components/ui/select';
import { Check, X, ArrowRight, RotateCcw, Target } from 'lucide-react';
const labels:Record<QuizKind,string>={identify:'Identify a structure',point:'Point to a structure',origin:'Muscle origin',insertion:'Muscle insertion',innervation:'Innervation',action:'Muscle action',lesion:'Nerve lesion',deformity:'Clinical deformity',fracture:'Fracture correlation'};
export interface QuizHandle{point:(id:string)=>void;}
interface Props{ref?:Ref<QuizHandle>;onQuestion:(q:Question)=>void;onReveal:(q:Question)=>void;}
export default function QuizPanel({ref,onQuestion,onReveal}:Props){
 const [kind,setKind]=useState<QuizKind>('innervation'),[difficulty,setDifficulty]=useState<Difficulty>('Foundations');
 const [q,setQ]=useState<Question>(()=>createQuestion('innervation','Foundations')),[answer,setAnswer]=useState<string|null>(null),[graded,setGraded]=useState(false);
 const [score,setScore]=useState(()=>{try{const s=JSON.parse(localStorage.getItem('mednote-quiz-v1')??'null');if(s&&Number.isSafeInteger(s.correct)&&Number.isSafeInteger(s.total)&&s.correct>=0&&s.total>=s.correct)return {correct:s.correct as number,total:s.total as number};}catch{}return {correct:0,total:0};});
 useEffect(()=>{onQuestion(q);},[q,onQuestion]);
 function nextQuestion(nextKind=kind,nextDifficulty=difficulty){setKind(nextKind);setDifficulty(nextDifficulty);setQ(createQuestion(nextKind,nextDifficulty,q.contextId));setAnswer(null);setGraded(false);}
 function attempt(id:string){if(answer!==null)return;setAnswer(id);if(!graded){setGraded(true);setScore(s=>{const v={correct:s.correct+(assess(q,id)?1:0),total:s.total+1};try{localStorage.setItem('mednote-quiz-v1',JSON.stringify(v));}catch{}return v;});}onReveal(q);}
 useImperativeHandle(ref,()=>({point:(id:string)=>{if(kind==='point')attempt(id);}}));
 const correct=q&&answer!==null&&assess(q,answer);
 return <div className="quiz-panel"><div className="quiz-heading"><span className="eyebrow">ACTIVE RECALL</span><div className="quiz-score"><strong>{score.correct}</strong> / {score.total}<small>correct on first attempt</small></div></div>
  <div className="quiz-settings"><Select value={kind} onValueChange={v=>nextQuestion(v as QuizKind,difficulty)}><SelectTrigger aria-label="Question type"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(labels).map(([id,label])=><SelectItem key={id} value={id} disabled={!quizAvailable(id as QuizKind)}>{label}{!quizAvailable(id as QuizKind)?' · awaiting 3D':''}</SelectItem>)}</SelectContent></Select><Select value={difficulty} onValueChange={v=>nextQuestion(kind,v as Difficulty)}><SelectTrigger aria-label="Difficulty"><SelectValue/></SelectTrigger><SelectContent>{['Foundations','Intermediate','Advanced'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
  {q&&<><span className="question-label">{kind==='point'?'POINT ON THE MODEL':'CHOOSE ONE ANSWER'}</span><h2>{q.prompt}</h2>{kind==='point'?<div className="point-instruction"><Target size={22}/><p>Rotate the model, then tap your answer. Its name stays hidden until your attempt.</p></div>:<div className="quiz-options">{q.options.map((o,i)=><button key={o.id} disabled={answer!==null} className={(answer!==null&&o.id===q.correctId?'correct ':'')+(answer===o.id&&o.id!==q.correctId?'incorrect':'')} onClick={()=>attempt(o.id)}><span className="option-letter">{'ABCD'[i]}</span><span>{o.label}</span>{answer!==null&&o.id===q.correctId&&<Check size={18}/>}</button>)}</div>}
  {answer!==null&&<div className={'quiz-feedback '+(correct?'correct':'incorrect')} role="status"><h3>{correct?<Check size={19}/>:<X size={19}/>} {correct?'Correct':'Review this relationship'}</h3><p>{q.explanation}</p><div><button className="inline-action" onClick={()=>{setAnswer(null);onQuestion(q);}}><RotateCcw size={14}/>Retry</button><button className="primary-button" onClick={()=>nextQuestion()}>Next question <ArrowRight size={15}/></button></div></div>}
  {answer===null&&<button className="skip-question" onClick={()=>nextQuestion()}>Skip question <ArrowRight size={14}/></button>}
  {(kind==='fracture'||kind==='deformity')&&<p className="console-note">{kind==='fracture'?'This question tests the neurovascular relationship. A selected fracture specimen, when available, is labeled separately.':'Illustrative bone posture; clinical rig review pending.'}</p>}</>}
 </div>;
}
