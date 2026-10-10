import {useState} from 'react';
import type {Explanation} from './types';

type Part={id:string;label:string;pattern:RegExp;detail:string;sourceQuote?:string};
function paragraphMatching(lesson:Explanation,pattern:RegExp){
 const sections=[...(lesson.clinical_layers?.mechanism.steps||[]).map(x=>x.text),
  ...lesson.mechanism.flatMap(s=>[s.detail||'',s.source_quote]),
  ...lesson.coverage?.map(c=>c.explanation)||[],...lesson.source_quotes];
 return sections.find(x=>pattern.test(x))||'';
}
function MechanismLab({source,lesson}:{source:string;lesson:Explanation}){
 const parts:Part[]=[
  {id:'rest',label:'Resting potential',pattern:/resting|rest\s+potential|راحة الغشاء|جهد الراحة/i,
   detail:'Resting membrane potential'},
  {id:'rise',label:'Depolarization',pattern:/depolari[sz]|إزالة الاستقطاب/i,
   detail:'Depolarization'},
  {id:'fall',label:'Repolarization',pattern:/repolari[sz]|إعادة الاستقطاب/i,
   detail:'Repolarization'},
  {id:'undershoot',label:'Hyperpolarization',pattern:/hyperpolari[sz]|فرط الاستقطاب/i,
   detail:'After-hyperpolarization'}
 ].filter(p=>p.pattern.test(source));
 const [selected,setSelected]=useState('rise');
 const active=parts.find(p=>p.id===selected)||parts[0];
 const ionLabels=[
  {symbol:'Na⁺',text:'Sodium',available:/sodium|Na\+|Na⁺|صوديوم/i.test(source)},
  {symbol:'K⁺',text:'Potassium',available:/potassium|K\+|K⁺|بوتاسيوم/i.test(source)}
 ].filter(x=>x.available);
 const positions:Record<string,{x:number;y:number}>={rest:{x:100,y:245},rise:{x:300,y:141},fall:{x:440,y:129},undershoot:{x:590,y:269}};
 return <section className="neuro-editorial-lab" aria-label="مخطط تفاعلي لجهد الفعل">
  <div className="neuro-lab-kicker">FIGURE 01 — MEMBRANE ELECTROPHYSIOLOGY</div>
  <h3>منحنى جهد الغشاء · Action Potential</h3>
  <p className="neuro-lab-lead">اختاري مرحلة من المنحنى لتري مكانها، ثم اربطيها بخطوة الشرح المراجَع من المصدر.</p>
  <svg viewBox="0 0 760 380" role="img" aria-label="منحنى تخطيطي لجهد الفعل بمرحلتي الصعود والهبوط ثم العودة إلى جهد الراحة؛ دون أرقام أو قياسات غير واردة في المصدر">
   <defs>
    <linearGradient id="apgraphbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff"/><stop offset="100%" stopColor="#f1f9f6"/></linearGradient>
    <linearGradient id="apline" x1="0" x2="1"><stop offset="0%" stopColor="#159b93"/><stop offset="52%" stopColor="#dc8e53"/><stop offset="100%" stopColor="#725cb6"/></linearGradient>
   </defs>
   <rect width="760" height="380" rx="18" fill="url(#apgraphbg)"/>
   {[96,157,218,279].map((y,i)=><line key={i} x1="94" y1={y} x2="711" y2={y} stroke="#d9e7e1" strokeDasharray="4 6" strokeWidth="1.3"/>)}
   <path d="M94 46 V310 H716" fill="none" stroke="#57756d" strokeWidth="2.5" strokeLinecap="round"/>
   <text x="30" y="178" transform="rotate(-90 30 178)" fill="#33534b" fontSize="15" textAnchor="middle" fontWeight="650">Membrane potential</text>
   <text x="405" y="355" fill="#33534b" fontSize="15" textAnchor="middle" fontWeight="650">Time →</text>
   <path d="M94 245 C160 245 205 245 240 244 C258 244 273 228 288 166 C309 66 333 65 355 67 C384 70 396 203 452 245 C494 263 520 300 555 279 C598 252 616 245 706 245" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round"/>
   <path d="M94 245 C160 245 205 245 240 244 C258 244 273 228 288 166 C309 66 333 65 355 67 C384 70 396 203 452 245 C494 263 520 300 555 279 C598 252 616 245 706 245" fill="none" stroke="url(#apline)" strokeWidth="6" strokeLinecap="round"/>
   <line x1="94" y1="245" x2="706" y2="245" stroke="#218e84" strokeWidth="1.2" strokeDasharray="8 7" opacity=".48"/>
   <text x="104" y="229" fill="#168378" fontSize="13">Resting level</text>
   {ionLabels.map((ion,i)=><g key={ion.symbol}>
    <rect x={i?632:102} y={i?32:32} width="99" height="34" rx="17" fill={i?'#f2e9fc':'#e0f5ee'}/>
    <text x={i?680:150} y="55" textAnchor="middle" fill={i?'#7152a9':'#137769'} fontSize="17" fontWeight="650">{ion.symbol}</text>
   </g>)}
   {active&&<g>
    <circle cx={positions[active.id].x} cy={positions[active.id].y} r="15" fill="#fff" stroke="#b76c82" strokeWidth="4"/>
    <circle cx={positions[active.id].x} cy={positions[active.id].y} r="5" fill="#b76c82"/>
    <path d={`M${positions[active.id].x} ${positions[active.id].y+18} V310`} stroke="#b76c82" strokeDasharray="5 5" strokeWidth="2"/>
   </g>}
  </svg>
  <div className="neuro-phase-controls" role="group" aria-label="مراحل جهد الفعل">
   {parts.map((p,i)=><button key={p.id} type="button" onClick={()=>setSelected(p.id)}
    aria-pressed={active?.id===p.id}><span>{i+1}</span>{p.label}</button>)}
  </div>
  {active&&<div className="neuro-phase-explanation" role="status">
   <strong>{active.label}</strong>
   <p dir="auto">{paragraphMatching(lesson,active.pattern)||'المرحلة موجودة في نص المحاضرة، لكن لا يوجد شرح آلية مراجع يمكن نسبته لهذه الخطوة تحديدًا.'}</p>
  </div>}
  <figcaption>رسم تعليمي نوعي (غير مقياسي): لا تُستنتج منه قيم جهد أو توقيت أو حدود عتبة. تُعرض فقط أسماء المراحل والأيونات الواردة في محتوى هذه الفكرة.</figcaption>
 </section>;
}
function NeuronLab({source,lesson}:{source:string;lesson:Explanation}){
 const labels=[
  {id:'dendrites',name:'Dendrites',pattern:/dendrit|تغصن/i,x:138,y:124},
  {id:'soma',name:'Cell body / Soma',pattern:/cell body|soma|جسم الخلية/i,x:249,y:244},
  {id:'axon',name:'Axon',pattern:/axon|محور عصبي/i,x:425,y:207},
  {id:'myelin',name:'Myelin sheath',pattern:/myelin|ميالين/i,x:545,y:113},
  {id:'terminal',name:'Axon terminals',pattern:/terminal|النهايات العصبية/i,x:665,y:255}
 ].filter(l=>l.pattern.test(source));
 const [focus,setFocus]=useState('soma');
 const selected=labels.find(l=>l.id===focus)||labels[0];
 return <section className="neuro-editorial-lab" aria-label="رسم تفاعلي لخلية عصبية">
  <div className="neuro-lab-kicker">FIGURE 02 — NEURAL MICROANATOMY</div>
  <h3>التركيب الوظيفي للخلية العصبية</h3>
  <p className="neuro-lab-lead">اضغطي اسم الجزء لتحديد موضعه في الرسم ثم اقرئي وصفه المستند إلى المحاضرة.</p>
  <svg viewBox="0 0 760 330" role="img" aria-label="رسم تخطيطي مبسط لخلية عصبية يتضمن جسم الخلية والتفرعات والمحور والنهايات">
   <defs><linearGradient id="axongrad"><stop offset="0%" stopColor="#80bcb0"/><stop offset="100%" stopColor="#d7b16b"/></linearGradient></defs>
   <rect width="760" height="330" rx="18" fill="#fafcf9"/>
   <path d="M205 158 C141 150 125 109 85 98 M199 153 C135 172 107 207 57 212 M205 146 C152 109 142 60 124 40 M215 178 C164 211 169 256 116 281 M199 130 C150 130 132 153 97 153" stroke="#378b81" strokeWidth="7" fill="none" strokeLinecap="round"/>
   <path d="M90 98 L63 72 M90 98 L54 110 M57 212 L32 196 M57 212 L37 237 M124 40 L101 21 M116 281 L96 304" stroke="#68ada1" strokeWidth="4" strokeLinecap="round"/>
   <ellipse cx="236" cy="163" rx="65" ry="54" fill="#ccefe3" stroke="#258c82" strokeWidth="4"/>
   <circle cx="232" cy="163" r="24" fill="#edc87e" stroke="#c59b45" strokeWidth="3"/>
   <path d="M301 163 C397 155 506 165 637 169" stroke="#9073aa" strokeWidth="10" fill="none" strokeLinecap="round"/>
   {[355,430,505,580].map((x,i)=><g key={i}>
    <rect x={x-28} y={150} width="54" height="29" rx="14" fill="#efdfa4" stroke="#c9a45e" strokeWidth="2"/>
    <line x1={x+27} y1="146" x2={x+27} y2="183" stroke="#75589d" strokeDasharray="3 3" strokeWidth="2"/>
   </g>)}
   <path d="M636 169 C681 128 693 110 722 96 M636 169 C688 161 701 169 731 169 M636 169 C673 205 693 243 729 254" fill="none" stroke="#8068a2" strokeWidth="6" strokeLinecap="round"/>
   {[96,169,254].map((y,i)=><circle key={i} cx={i===0?722:i===1?731:729} cy={y} r="10" fill="#b18db8" stroke="#8068a2" strokeWidth="2"/>)}
   {selected&&<g>
    <circle cx={selected.x} cy={selected.y} r="20" stroke="#d76d73" strokeWidth="3.2" fill="#d76d7322"/>
    <path d={`M${selected.x} ${selected.y-22} V23`} stroke="#d76d73" strokeDasharray="5 5" strokeWidth="2"/>
   </g>}
  </svg>
  <div className="neuro-phase-controls" role="group" aria-label="أجزاء العصبون">{labels.map((label,i)=>
   <button key={label.id} type="button" onClick={()=>setFocus(label.id)} aria-pressed={selected?.id===label.id}>
    <span>{i+1}</span>{label.name}</button>)}</div>
  {selected&&<div className="neuro-phase-explanation" role="status"><strong>{selected.name}</strong>
   <p dir="auto">{paragraphMatching(lesson,selected.pattern)||'هذا الجزء مذكور في المحاضرة، لكن وصفه الوظيفي التفصيلي لم يكتمل توثيقه.'}</p>
  </div>}
  <figcaption>رسم تخطيطي تعليمي للمواضع النسبية، وليس صورة تشريحية أصلية أو رسمًا مقياسيًا. تظهر فقط تسميات التراكيب الموجودة في المحتوى.</figcaption>
 </section>;
}
export function availableNeuroFigures(lesson:Explanation,slide:string){
 const source=[slide,lesson.explanation,...(lesson.source_quotes||[]),...(lesson.visual?.labels||[]).map(x=>x.label),
  ...(lesson.clinical_layers?.mechanism.steps||[]).map(x=>x.text)].join(' ');
 const potential=/action potential|membrane potential|depolari[sz]|repolari[sz]|جهد الفعل|جهد الغشاء|الاستقطاب/i.test(source);
 const neuron=/neurons?|عصبون|خلية عصبية/i.test(source)&&
  /axon|dendrit|soma|myelin|cell body|تغصن|ميالين|محور عصبي/i.test(source);
 return {potential,neuron,source};
}
export function NeuroVisualLab({lesson,slide}:{lesson:Explanation;slide:string}){
 const supported=availableNeuroFigures(lesson,slide);
 const [mode,setMode]=useState<'potential'|'neuron'>(supported.potential?'potential':'neuron');
 if(!supported.potential&&!supported.neuron)return null;
 const selected=(mode==='potential'&&supported.potential)?'potential':
  (mode==='neuron'&&supported.neuron)?'neuron':supported.potential?'potential':'neuron';
 return <div className="neuro-lab-module">
  <div className="neuro-lab-topbar">
   <strong>INTERACTIVE MEDICAL VISUAL</strong>
   <div role="group" aria-label="اختاري الرسم">
    {supported.potential&&<button type="button" aria-pressed={selected==='potential'} onClick={()=>setMode('potential')}>Action Potential</button>}
    {supported.neuron&&<button type="button" aria-pressed={selected==='neuron'} onClick={()=>setMode('neuron')}>Neuron</button>}
   </div>
  </div>
  {selected==='potential'?<MechanismLab lesson={lesson} source={supported.source}/>:<NeuronLab lesson={lesson} source={supported.source}/>}
 </div>;
}
