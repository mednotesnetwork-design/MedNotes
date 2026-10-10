import {MechanismPlayer} from './MechanismPlayer';
import {lazy,Suspense,useState} from 'react';
import {ChevronLeft,ChevronRight,Lightbulb,Layers3,Box} from 'lucide-react';
import {entities} from '@atlas/lib/anatomy';
import type {Explanation,StudyQuestion,Basis} from './types';
import {ClinicalTeachingLayers,type OriginalSourceImage} from './ClinicalTeachingLayers';
import {MedicalAtlasLayouts} from './MedicalAtlasLayouts';
import {SourceAwareNMJ} from './SourceAwareNMJ';
import {NeuroVisualLab,availableNeuroFigures} from './NeuroVisualLab';
const InlineAnatomy=lazy(()=>import('./InlineAnatomy'));
const basisText=(basis?:Basis)=>basis==='additional'?'توضيح إضافي خارج المحاضرة':'شرح مستند للمحاضرة';

function ReverseReview({questions,answers,onAnswer,prefix,onRetest}:{onRetest:(question:string)=>void;questions:StudyQuestion[];answers:Record<string,number>;onAnswer:(key:string,value?:number)=>void;prefix:string}){
 return <section className="lesson-review" aria-label="Reverse Review"><h3>اختبري الفكرة · Reverse Review</h3>{questions.map((q,i)=>{
 const key=prefix+':'+i,chosen=answers[key];
 return <fieldset key={key} className="checkpoint"><legend>{q.question}</legend>{q.options.map((o,j)=><button key={j} type="button" disabled={chosen!==undefined}
 className={chosen===undefined?'':j===q.correct_index?'answer-is-correct':chosen===j?'answer-is-incorrect':''}
 aria-label={`الخيار ${String.fromCharCode(65+j)}: ${o}`} onClick={()=>onAnswer(key,j)}>
 <span className="answer-option-letter" aria-hidden="true">{String.fromCharCode(65+j)}</span>
 <span className="answer-option-text" dir="auto">{o}</span>
 {chosen!==undefined&&j===q.correct_index&&<span className="answer-option-result" aria-label="الإجابة الصحيحة">✓</span>}
 {chosen!==undefined&&chosen===j&&chosen!==q.correct_index&&<span className="answer-option-result" aria-label="اختيار غير صحيح">×</span>}
 </button>)}{chosen!==undefined&&<div className="study-feedback"><strong>{chosen===q.correct_index?'إجابة صحيحة':'لنراجع الفكرة وراء السؤال'}</strong><h4>المفهوم الذي يختبره السؤال</h4><p>{q.concept||q.explanations[q.correct_index]}</p><h4>لماذا الإجابة الصحيحة؟</h4><p>{q.options[q.correct_index]}: {q.explanations[q.correct_index]}</p><h4>لماذا لا نختار البدائل؟</h4>{q.options.map((o,j)=>j!==q.correct_index&&<p key={j}>{o}: {q.explanations[j]}</p>)}{q.source_quote&&<blockquote dir="auto">{q.source_quote}</blockquote>}<button onClick={()=>onAnswer(key)}>أعيد المحاولة</button>{chosen!==q.correct_index&&<button onClick={()=>onRetest('راجع التباس فهمي في: '+q.question+' إجابتي كانت: '+q.options[chosen]+' ثم اختبرني بسؤال مشابه جديد من نفس المحتوى')}>راجع الفكرة واختبرني بسؤال مشابه</button>}</div>}</fieldset>;
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
 const clinicalSystems=new Set([...items,...(spec?.labels||[])].map(x=>x.system).filter(x=>['skin','respiratory','circulation'].includes(x||'')));
 const showPatient=kind==='clinical'||clinicalSystems.size>=2;
 return <section className="concept-visual" aria-label="التوضيح البصري داخل الشرح"><span className="lesson-basis"><Layers3 size={14}/>{basisText(spec?.basis)} · رسم تخطيطي تعليمي</span><h3>{spec?.title||'كيف تحدث الفكرة؟'}</h3>{spec?.caption&&<p>{spec.caption}</p>}
  {showPatient&&<div className="clinical-diagram"><svg viewBox="0 0 240 300" role="img" aria-label="مخطط مجموعات الأعراض؛ ليس خريطة تشريحية دقيقة"><circle cx="120" cy="35" r="24" fill="none" stroke={color('skin')} strokeWidth="3"/><path d="M87 72 Q60 78 54 130 L46 183 M153 72 Q180 78 186 130 L194 183 M88 74 L88 190 L76 284 M152 74 L152 190 L164 284 M88 190 Q120 207 152 190" fill="none" stroke={color('skin')} strokeWidth="5"/><path d="M117 78 L117 124 Q93 93 92 146 Q99 170 116 152 M123 78 L123 124 Q148 93 148 146 Q140 170 124 152" fill={color('respiratory')} opacity=".8"/><path d="M119 169 C102 151 90 176 119 197 C148 177 136 151 119 169" fill={color('circulation')}/></svg><div>{['skin','respiratory','circulation'].map((system,i)=><div className={'system-group '+(system===currentSystem?'active':'')} key={system}><strong>{['جلدية','تنفسية','دورانية'][i]}</strong>{((spec?.labels||[]).some(x=>x.system===system)?(spec?.labels||[]):items).filter(x=>x.system===system).map((x,j)=><p key={j}>{x.label} — {x.detail}</p>)}</div>)}</div></div>}
  {kind==='skin'&&<svg className="skin-diagram" viewBox="0 0 440 165" role="img" aria-label="رسم رمزي لصفات الآفة المذكورة؛ غير مقياسي"><path d="M10 70 Q110 64 220 70 T430 70 L430 145 L10 145Z" fill="#D7AEB3" opacity=".2"/><path d="M10 70 Q110 64 220 70 T430 70" stroke="#D7AEB3" strokeWidth="6" fill="none"/>{features.map((f,i)=>{const x=60+i*75;return <g key={f}>{!['scale','crust'].includes(f)&&<path d={`M${x-22} 70 Q${x} 20 ${x+22} 70`} fill={f==='pustule'?'#E6CFB7':f==='vesicle'?'#8DD3B360':'#D7AEB3'} stroke="#E6CFB7" strokeWidth="2"/>}{(f==='scale'||f==='crust')&&<path d={`M${x-18} 66 l12 -5 10 5 13 -4`} stroke="#E6CFB7" strokeWidth="5" fill="none"/>}<text x={x} y="120" textAnchor="middle" fill="#E6CFB7" fontSize="12">{f}</text></g>;})}</svg>}
  {kind==='nmj'&&<SourceAwareNMJ lesson={lesson}/>}
  <div className={'concept-nodes '+(kind==='comparison'?'comparison':'')} aria-label="أجزاء الرسم">{items.map((item,i)=><button key={i} aria-pressed={step===i} onClick={()=>setStep(i)}><span>{i+1}</span>{item.label}{!['comparison','clinical','skin','anatomy'].includes(kind)&&i<items.length-1&&<b aria-hidden="true">↓</b>}</button>)}</div>
  {active&&<div className="concept-detail" aria-live="polite"><strong>{active.label}</strong><p>{active.detail||('source_quote' in active?active.source_quote:'')}</p></div>}
  {items.length>1&&<div className="concept-controls"><button disabled={step===0} onClick={()=>setStep(s=>s-1)}><ChevronRight size={15}/>السابق</button><span>{step+1} / {items.length}</span><button disabled={step===items.length-1} onClick={()=>setStep(s=>s+1)}>التالي<ChevronLeft size={15}/></button></div>}
 </section>;
}

export type LearningTab='explain'|'visual'|'quiz'|'3d';
export function LessonJourney({lesson,slide,answers,onAnswer,prefix,onAsk,busy,view='all',sourceImages=[]}:{lesson:Explanation;slide:string;answers:Record<string,number>;onAnswer:(key:string,value?:number)=>void;prefix:string;onAsk:(q:string)=>void;busy:boolean;view?:LearningTab|'all';sourceImages?:OriginalSourceImage[]}){
 const [revealed,setRevealed]=useState(false),[modelOpen,setModelOpen]=useState(false);
 const showExplain=view==='all'||view==='explain';
 const showVisual=view==='all'||view==='visual'||view==='explain';
 const neuroFigures=availableNeuroFigures(lesson,slide);
 const showQuiz=view==='all'||view==='quiz';
 const supportedVisuals=lesson.textbook_layouts?.length?lesson.textbook_layouts:
  lesson.clinical_layers?.mechanism.steps.length&&lesson.clinical_layers.mechanism.steps.length>=2?
   [{kind:'flowchart' as const,title:lesson.visual?.title||'التسلسل العلمي خطوة بخطوة',
     nodes:lesson.clinical_layers.mechanism.steps.map((step,i)=>({
      label:`الخطوة ${i+1}`,detail:step.text,source_item_ids_used:step.source_item_ids_used
     }))}]:
  lesson.clinical_layers?.visual_cues.length&&lesson.clinical_layers.visual_cues.length>=2?
   [{kind:lesson.clinical_layers.visual_cues.length<=4?'radial_map' as const:'classification_grid' as const,
    title:lesson.visual?.title||'العلاقات والمكونات المرئية',
    nodes:lesson.clinical_layers.visual_cues.map(cue=>({
     label:cue.label,detail:cue.detail,source_item_ids_used:cue.source_item_ids_used
    }))}]:[];
 const showAnatomy=view==='all'||view==='3d'||view==='explain';
 const opening=lesson.opening,hasOpening=opening&&opening.kind!=='none'&&opening.prompt;
 const supplemental=lesson.source_mode==='supplemental';
 const source=(slide+' '+lesson.explanation).toLowerCase();
 const matches=entities.filter(e=>['bone','muscle','nerve','artery','vein','joint','ligament'].includes(e.system)&&[e.name,...e.aliases].some(n=>n.length>4&&source.includes(n.toLowerCase()))).sort((a,b)=>source.indexOf(a.name.toLowerCase())-source.indexOf(b.name.toLowerCase())).slice(0,8);
 const anatomyRelevant=matches.length>0&&(lesson.visual?.kind==='anatomy'||/course|spatial|groove|passes|مسار|علاقة|موضع/.test(source));
 return <article className="lesson-journey">
  <div className="journey-meta">{supplemental?'المحاضرة + إضافات موسومة':'Lecture only · المحاضرة فقط'}</div>
  {lesson.review_note&&<p className="lesson-basis">{lesson.review_note}</p>}
  {showExplain&&hasOpening&&<section className="case-opening"><span className="lesson-basis"><Lightbulb size={15}/>{opening.kind==='case'?'حالة تعليمية افتراضية':'فكّري أولًا'} · {basisText(opening.basis)}</span>{opening.scene&&<p>{opening.scene}</p>}<h3>{opening.prompt}</h3><button aria-expanded={revealed} onClick={()=>setRevealed(v=>!v)}>{revealed?'إخفاء التفسير':'اكشفي التفسير خطوة بخطوة'}</button>{revealed&&<p className="opening-answer">{opening.answer}</p>}</section>}
  {<>
   {(showExplain||showVisual)&&<MechanismPlayer source={slide} lesson={lesson}/>}
   {showExplain&&lesson.clinical_layers&&<ClinicalTeachingLayers layers={lesson.clinical_layers} registry={lesson.source_registry} sourceImages={sourceImages} view="explain"/>}
  {showVisual&&(neuroFigures.potential||neuroFigures.neuron)&&<NeuroVisualLab lesson={lesson} slide={slide}/>}
  {(showExplain||showVisual)&&<MedicalAtlasLayouts layouts={supportedVisuals} callouts={lesson.clinical_callouts} registry={lesson.source_registry} sourceImages={sourceImages} view={showVisual&&!showExplain?'visual':'explain'}/>}
  {showVisual&&!supportedVisuals.length&&lesson.clinical_layers&&<ClinicalTeachingLayers layers={lesson.clinical_layers} registry={lesson.source_registry} sourceImages={sourceImages} view="visual"/>}

  {showExplain&&!lesson.clinical_layers&&<section className="lesson-core"><h3>ما الذي يجب أن أفهمه؟</h3><p className="preserve" dir="auto">{lesson.explanation}</p>{lesson.terms.length>0&&<div className="lesson-terms">{lesson.terms.map((t,i)=><details key={i}><summary>{t.term}</summary><p>{t.meaning}</p><button disabled={busy} onClick={()=>onAsk('اشرح المصطلح: '+t.term)}>بسّطي هذا المصطلح</button></details>)}</div>}</section>}
   {showVisual&&!neuroFigures.potential&&!neuroFigures.neuron&&<ConceptVisual lesson={lesson}/>}
  {view==='visual'&&!(lesson.mechanism?.length||lesson.visual?.labels?.length)&&(!lesson.visual||lesson.visual.kind==='none')&&<p className="lesson-basis">لا يتضمن هذا الجزء رسمًا يمكن إنشاؤه من مصدر المحاضرة بدقة.</p>}
   {showAnatomy&&(view==='3d'?matches.length>0:anatomyRelevant)&&<section className="anatomy-in-context"><h3>أين تقع هذه العلاقة؟</h3><p>استكشفي التركيب مع إبقاء السلايد والشرح أمامك.</p>{view!=='3d'&&<button aria-expanded={modelOpen} onClick={()=>setModelOpen(v=>!v)}><Box size={16}/>{modelOpen?'إغلاق النموذج':'فتح 3D داخل الشرح'}</button>}{(modelOpen||view==='3d')&&<Suspense fallback={<p role="status">فتح النموذج…</p>}><InlineAnatomy ids={matches.map(e=>e.id)} supplemental={supplemental}/></Suspense>}</section>}
   {view==='3d'&&!matches.length&&<p className="lesson-basis">لا يوجد تركيب مطابق في أطلس 3D لهذا السلايد؛ لن نعرض تشريحًا غير موثّق.</p>}
  {showExplain&&!lesson.clinical_layers&&lesson.clinical_connection?.text&&<section className="clinical-connection"><span className="lesson-basis">Clinical connection · {basisText(lesson.clinical_connection.basis)}</span><p>{lesson.clinical_connection.text}</p></section>}
   {showExplain&&lesson.high_yield.length>0&&<section><h3>نقاط تستحق الانتباه في الاختبار</h3><ul>{lesson.high_yield.map((s,i)=><li key={i}>{s}</li>)}</ul></section>}
   {showQuiz&&lesson.checkpoint?.question&&<section className="thought-checkpoint"><h3>Checkpoint · توقفي وفكّري</h3><p>{lesson.checkpoint.question}</p><details><summary>قارني إجابتك</summary><strong>{lesson.checkpoint.concept}</strong><p>{lesson.checkpoint.answer}</p></details></section>}
   {showQuiz&&!!lesson.questions.length&&<ReverseReview questions={lesson.questions} answers={answers} onAnswer={onAnswer} prefix={prefix} onRetest={onAsk}/>}
   {view==='quiz'&&!lesson.checkpoint?.question&&!lesson.questions.length&&<p className="lesson-basis">لم تتوفر أسئلة يمكن التحقق من إجاباتها من محتوى هذا السلايد.</p>}
  {showExplain&&lesson.clarifications.length>0&&<aside className="study-warning"><strong>توضيح إضافي خارج المحاضرة</strong>{lesson.clarifications.map((s,i)=><p key={i}>{s}</p>)}</aside>}
   {showExplain&&!!lesson.summary?.length&&<section className="lesson-summary"><h3>خذي معك هذه الفكرة</h3><ul>{lesson.summary.map((s,i)=><li key={i}>{s}</li>)}</ul></section>}
   {showExplain&&<details className="lesson-evidence"><summary>النص الذي استند إليه الشرح</summary>{lesson.source_quotes.length?lesson.source_quotes.map((q,i)=><blockquote key={i} dir="auto">{q}</blockquote>):<p>استند الشرح إلى صورة السلايد؛ لا توجد اقتباسات نصية قابلة للتحقق.</p>}</details>}
  </>}
 </article>;
}
