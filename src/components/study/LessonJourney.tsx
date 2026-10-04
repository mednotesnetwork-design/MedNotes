import {lazy,Suspense,useState} from 'react';
import {ChevronLeft,ChevronRight,Lightbulb,Layers3,Box} from 'lucide-react';
import {entities} from '@atlas/lib/anatomy';
import type {Explanation,StudyQuestion,Basis} from './types';
const InlineAnatomy=lazy(()=>import('./InlineAnatomy'));
const basisText=(basis?:Basis)=>basis==='additional'?'توضيح إضافي خارج المحاضرة':'من المحاضرة';

function ReverseReview({questions,answers,onAnswer,prefix}:{questions:StudyQuestion[];answers:Record<string,number>;onAnswer:(key:string,value?:number)=>void;prefix:string}){
 return <section className="lesson-review" aria-label="Reverse Review"><h3>اختبري الفكرة · Reverse Review</h3>{questions.map((q,i)=>{
 const key=prefix+':'+i,chosen=answers[key];
 return <fieldset key={key} className="checkpoint"><legend>{q.question}</legend>{q.options.map((o,j)=><button key={j} disabled={chosen!==undefined} className={chosen===j?'selected':''} onClick={()=>onAnswer(key,j)}>{o}</button>)}{chosen!==undefined&&<div className="study-feedback"><strong>{chosen===q.correct_index?'إجابة صحيحة':'لنراجع الفكرة وراء السؤال'}</strong><h4>المفهوم الذي يختبره السؤال</h4><p>{q.concept||q.explanations[q.correct_index]}</p><h4>لماذا الإجابة الصحيحة؟</h4><p>{q.options[q.correct_index]}: {q.explanations[q.correct_index]}</p><h4>لماذا لا نختار البدائل؟</h4>{q.options.map((o,j)=>j!==q.correct_index&&<p key={j}>{o}: {q.explanations[j]}</p>)}{q.source_quote&&<blockquote dir="auto">{q.source_quote}</blockquote>}<button onClick={()=>onAnswer(key)}>أعيد المحاولة</button></div>}</fieldset>;
 })}</section>;
}

/** Only fixed, bounded SVG primitives are used. Model output is rendered as text, never markup. */
function ConceptVisual({lesson}:{lesson:Explanation}){
 const [step,setStep]=useState(0);
 const spec=lesson.visual,steps=lesson.mechanism||[],items=steps.length?steps:(spec?.labels||[]);
 if(!items.length&&(!spec||spec.kind==='none'))return null;
 const active=items[Math.min(step,Math.max(0,items.length-1))],kind=spec?.kind||'sequence';
 const currentSystem=active?.system||'other';
 const color=(system:string)=>system===currentSystem?'#8DD3B3':'#385657';
 const features=spec?.skin_features||[];
 return <section className="concept-visual" aria-label="التوضيح البصري داخل الشرح"><span className="lesson-basis"><Layers3 size={14}/>{basisText(spec?.basis)} · رسم تخطيطي تعليمي</span><h3>{spec?.title||'كيف تحدث الفكرة؟'}</h3>{spec?.caption&&<p>{spec.caption}</p>}
  {kind==='clinical'&&<div className="clinical-diagram"><svg viewBox="0 0 240 300" role="img" aria-label="مخطط مجموعات الأعراض؛ ليس خريطة تشريحية دقيقة"><circle cx="120" cy="35" r="24" fill="none" stroke={color('skin')} strokeWidth="3"/><path d="M87 72 Q60 78 54 130 L46 183 M153 72 Q180 78 186 130 L194 183 M88 74 L88 190 L76 284 M152 74 L152 190 L164 284 M88 190 Q120 207 152 190" fill="none" stroke={color('skin')} strokeWidth="5"/><path d="M117 78 L117 124 Q93 93 92 146 Q99 170 116 152 M123 78 L123 124 Q148 93 148 146 Q140 170 124 152" fill={color('respiratory')} opacity=".8"/><path d="M119 169 C102 151 90 176 119 197 C148 177 136 151 119 169" fill={color('circulation')}/></svg><div>{['skin','respiratory','circulation'].map((system,i)=><div className={'system-group '+(system===currentSystem?'active':'')} key={system}><strong>{['جلدية','تنفسية','دورانية'][i]}</strong>{(spec?.labels||[]).filter(x=>x.system===system).map((x,j)=><p key={j}>{x.label} — {x.detail}</p>)}</div>)}</div></div>}
  {kind==='skin'&&<svg className="skin-diagram" viewBox="0 0 440 165" role="img" aria-label="رسم رمزي لصفات الآفة المذكورة؛ غير مقياسي"><path d="M10 70 Q110 64 220 70 T430 70 L430 145 L10 145Z" fill="#D7AEB3" opacity=".2"/><path d="M10 70 Q110 64 220 70 T430 70" stroke="#D7AEB3" strokeWidth="6" fill="none"/>{features.map((f,i)=>{const x=60+i*75;return <g key={f}><path d={`M${x-22} 70 Q${x} 20 ${x+22} 70`} fill={f==='pustule'?'#E6CFB7':f==='vesicle'?'#8DD3B360':'#D7AEB3'} stroke="#E6CFB7" strokeWidth="2"/>{(f==='scale'||f==='crust')&&<path d={`M${x-18} 44 l12 -5 10 8 13 -4`} stroke="#E6CFB7" strokeWidth="5" fill="none"/>}<text x={x} y="120" textAnchor="middle" fill="#E6CFB7" fontSize="12">{f}</text></g>;})}</svg>}
  {kind==='nmj'&&<svg className="nmj-diagram" viewBox="0 0 440 150" role="img" aria-label="مخطط رمزي لنقل الإشارة عبر الوصلة العصبية العضلية"><path d="M18 15 L160 15 L160 60 Q160 85 95 85 Q30 85 30 60 Z" fill="#8DD3B32b" stroke="#8DD3B3" strokeWidth="2"/><path d="M18 116 L75 116 L75 130 L90 130 L90 116 L130 116 L130 130 L145 130 L145 116 L420 116" stroke="#D7AEB3" strokeWidth="5" fill="none"/>{[0,1,2,3].map(i=><circle key={i} cx={60+i*25} cy={58} r="4" fill="#E6CFB7"/>)}<path d="M190 45 H390 M380 36 L391 45 380 54" stroke="#8DD3B3" strokeWidth="3" fill="none"/><text x="290" y="80" textAnchor="middle" fill="#E6CFB7" fontSize="14">{step+1} / {items.length}</text></svg>}
  <div className={'concept-nodes '+(kind==='comparison'?'comparison':'')} aria-label="أجزاء الرسم">{items.map((item,i)=><button key={i} aria-pressed={step===i} onClick={()=>setStep(i)}><span>{i+1}</span>{item.label}{kind!=='comparison'&&i<items.length-1&&<b aria-hidden="true">↓</b>}</button>)}</div>
  {active&&<div className="concept-detail" aria-live="polite"><strong>{active.label}</strong><p>{active.detail||('source_quote' in active?active.source_quote:'')}</p></div>}
  {items.length>1&&<div className="concept-controls"><button disabled={step===0} onClick={()=>setStep(s=>s-1)}><ChevronRight size={15}/>السابق</button><span>{step+1} / {items.length}</span><button disabled={step===items.length-1} onClick={()=>setStep(s=>s+1)}>التالي<ChevronLeft size={15}/></button></div>}
 </section>;
}

export function LessonJourney({lesson,slide,answers,onAnswer,prefix,onAsk,busy}:{lesson:Explanation;slide:string;answers:Record<string,number>;onAnswer:(key:string,value?:number)=>void;prefix:string;onAsk:(q:string)=>void;busy:boolean}){
 const [revealed,setRevealed]=useState(false),[show3d,setShow3d]=useState(false);
 const opening=lesson.opening,hasOpening=opening&&opening.kind!=='none'&&opening.prompt;
 const supplemental=lesson.source_mode==='supplemental';
 const source=(slide+' '+lesson.explanation).toLowerCase();
 const matches=entities.filter(e=>['bone','muscle','nerve','artery','vein','joint','ligament'].includes(e.system)&&[e.name,...e.aliases].some(n=>n.length>4&&source.includes(n.toLowerCase()))).slice(0,8);
 const anatomyRelevant=matches.length>0&&(lesson.visual?.kind==='anatomy'||/course|spatial|groove|passes|مسار|علاقة|موضع/.test(source));
 return <article className="lesson-journey">
  <div className="journey-meta">{supplemental?'المحاضرة + إضافات موسومة':'Lecture only · المحاضرة فقط'}</div>
  {hasOpening&&<section className="case-opening"><span className="lesson-basis"><Lightbulb size={15}/>{opening.kind==='case'?'حالة تعليمية افتراضية':'فكّري أولًا'} · {basisText(opening.basis)}</span>{opening.scene&&<p>{opening.scene}</p>}<h3>{opening.prompt}</h3><button aria-expanded={revealed} onClick={()=>setRevealed(v=>!v)}>{revealed?'إخفاء التفسير':'اكشفي التفسير خطوة بخطوة'}</button>{revealed&&<p className="opening-answer">{opening.answer}</p>}</section>}
  {(!hasOpening||revealed)&&<>
   <section className="lesson-core"><h3>ما الذي يجب أن أفهمه؟</h3><p className="preserve" dir="auto">{lesson.explanation}</p>{lesson.terms.length>0&&<div className="lesson-terms">{lesson.terms.map((t,i)=><details key={i}><summary>{t.term}</summary><p>{t.meaning}</p><button disabled={busy} onClick={()=>onAsk('اشرح المصطلح: '+t.term)}>بسّطي هذا المصطلح</button></details>)}</div>}</section>
   <ConceptVisual lesson={lesson}/>
   {anatomyRelevant&&<section className="anatomy-in-context"><h3>أين تقع هذه العلاقة؟</h3><p>استكشفي التركيب مع إبقاء السلايد والشرح أمامك.</p><button aria-expanded={show3d} onClick={()=>setShow3d(v=>!v)}><Box size={16}/>{show3d?'إغلاق النموذج':'فتح 3D داخل الشرح'}</button>{show3d&&<Suspense fallback={<p role="status">فتح النموذج…</p>}><InlineAnatomy ids={matches.map(e=>e.id)} supplemental={supplemental}/></Suspense>}</section>}
   {lesson.clinical_connection?.text&&<section className="clinical-connection"><span className="lesson-basis">Clinical connection · {basisText(lesson.clinical_connection.basis)}</span><p>{lesson.clinical_connection.text}</p></section>}
   {lesson.high_yield.length>0&&<section><h3>نقاط تستحق الانتباه في الاختبار</h3><ul>{lesson.high_yield.map((s,i)=><li key={i}>{s}</li>)}</ul></section>}
   {lesson.checkpoint?.question&&<section className="thought-checkpoint"><h3>Checkpoint · توقفي وفكّري</h3><p>{lesson.checkpoint.question}</p><details><summary>قارني إجابتك</summary><strong>{lesson.checkpoint.concept}</strong><p>{lesson.checkpoint.answer}</p></details></section>}
   {!!lesson.questions.length&&<ReverseReview questions={lesson.questions} answers={answers} onAnswer={onAnswer} prefix={prefix}/>}
   {lesson.clarifications.length>0&&<aside className="study-warning"><strong>توضيح إضافي خارج المحاضرة</strong>{lesson.clarifications.map((s,i)=><p key={i}>{s}</p>)}</aside>}
   {!!lesson.summary?.length&&<section className="lesson-summary"><h3>خذي معك هذه الفكرة</h3><ul>{lesson.summary.map((s,i)=><li key={i}>{s}</li>)}</ul></section>}
   <details className="lesson-evidence"><summary>النص الذي استند إليه الشرح</summary>{lesson.source_quotes.length?lesson.source_quotes.map((q,i)=><blockquote key={i} dir="auto">{q}</blockquote>):<p>استند الشرح إلى صورة السلايد؛ لا توجد اقتباسات نصية قابلة للتحقق.</p>}</details>
  </>}
 </article>;
}
