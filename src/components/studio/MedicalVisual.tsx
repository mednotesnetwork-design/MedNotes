import {lazy,Suspense,useState} from 'react';
import {Activity,ArrowLeftRight,BrainCircuit,FlaskConical} from 'lucide-react';
import type {Source,TeachingChapter} from './studio-types';
const Axon3D=lazy(()=>import('./Axon3D').then(mod=>({default:mod.Axon3D})));

type MicroStep=TeachingChapter['mechanism'][number];
function visualPhase(text:string,kind:VisualKind){
 const z=text.toLowerCase();
 if(kind==='axon')return /retrograde|dynein|عكسي|راجعة/.test(z)?1:/anterograde|kinesin|أمامي/.test(z)?0:undefined;
 if(kind==='action-potential'){
  if(/hyperpolar|فرط الاستقطاب/.test(z))return 3;
  if(/repolar|إعادة الاستقطاب|potassium|k\+|قنوات البوتاسيوم/.test(z))return 2;
  if(/depolar|إزالة الاستقطاب|sodium|na\+|قنوات الصوديوم|threshold|العتبة/.test(z))return 1;
  if(/rest|راحة/.test(z))return 0;
 }
 if(kind==='nmj'){
  if(/end.plate|postsynaptic|muscle action potential|جهد اللوحة|الجهد العضلي/.test(z))return 5;
  if(/receptor|binding|مستقبل|ارتباط|nicotinic/.test(z))return 4;
  if(/release|secret|exocytosis|إفراز|انطلاق|إطلاق الأستيل|انتشار الأستيل/.test(z))return 3;
  if(/fusion|fuse|حويصل.*اندماج|اندماج الحويصل/.test(z))return 2;
  if(/calcium|ca2|ca²|كالسيوم/.test(z))return 1;
  if(/arrival|arrives|terminal|وصول جهد|النهاية العصبية/.test(z))return 0;
 }
 return undefined;
}


export type VisualKind='axon'|'action-potential'|'nmj'|'source';
export function visualKindFor(text:string):VisualKind{
 if(/axonal transport|النقل المحوري|النقل الأمامي|النقل العكسي|kinesin|dynein/i.test(text))return 'axon';
 if(/neuromuscular junction|neuromuscular transmission|الوصلة العصبية العضلية|neuromuscular synapse/i.test(text))return 'nmj';
 if(/action potential|جهد الفعل|depolariz|repolariz|إزالة الاستقطاب|إعادة الاستقطاب/i.test(text))return 'action-potential';
 return 'source';
}
function AxonVisual({step}:{step?:MicroStep}){
 const [chosen,setChosen]=useState<'forward'|'back'>('forward');
 const forced=step?visualPhase([step.title,step.visual_focus,step.motion].join(' '),'axon'):undefined;
 const direction=forced===undefined?chosen:forced===0?'forward':'back';
 return <div className="mn4-atlas">
  <div className="mn4-atlas-top"><span><BrainCircuit size={17}/> AXONAL TRANSPORT</span><div className="mn4-segment"><button aria-pressed={direction==='forward'} onClick={()=>setChosen('forward')}>Anterograde</button><button aria-pressed={direction==='back'} onClick={()=>setChosen('back')}>Retrograde</button></div></div>
  <svg className="mn4-med-svg" viewBox="0 0 760 320" role="img" aria-label="الخلية العصبية ومسارات النقل المحوري على الأنابيب الدقيقة: الأمامي إلى النهايات والعكسي إلى جسم الخلية">
   <defs><linearGradient id="mn4-axon-fill" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#173f40"/><stop offset="1" stopColor="#225558"/></linearGradient><radialGradient id="mn4-soma-fill"><stop stopColor="#438f81"/><stop offset="1" stopColor="#195653"/></radialGradient></defs>
   <rect width="760" height="320" rx="16" fill="#102b2d"/>
   <path d="M123 130 C215 118 360 115 617 126 C652 128 661 194 621 196 C384 208 228 194 123 190Z" fill="url(#mn4-axon-fill)" stroke="#5e9a90" strokeWidth="1.6"/>
   <path d="M168 144H612M168 180H612" stroke="#78c8aa" strokeWidth="3" strokeDasharray="11 9" strokeLinecap="round" opacity=".9"/>
   <path d="M166 161H614" stroke="#c5ac83" strokeWidth="5" opacity=".8" strokeLinecap="round"/>
   <circle cx="95" cy="162" r="73" fill="url(#mn4-soma-fill)" stroke="#92ceb3" strokeWidth="2"/><circle cx="92" cy="162" r="23" fill="#102c30" stroke="#8bcfb6" strokeWidth="2"/>
   <path d="M625 160C658 121 697 122 711 90M625 160C682 160 700 163 721 183M625 160C676 192 692 220 699 239" stroke="#63bea5" strokeWidth="14" fill="none" strokeLinecap="round"/>
   <circle cx="711" cy="90" r="11" fill="#93d3b1"/><circle cx="721" cy="183" r="11" fill="#93d3b1"/><circle cx="699" cy="239" r="11" fill="#93d3b1"/>
   <text x="94" y="258" textAnchor="middle" fill="#d8e5de" fontSize="19">Soma</text><text x="94" y="280" textAnchor="middle" fill="#9dbcb1" fontSize="13">Cell body</text>
   <text x="648" y="282" textAnchor="middle" fill="#d8e5de" fontSize="18">Axon terminals</text><text x="388" y="104" textAnchor="middle" fill="#91c5b7" fontSize="15">Microtubules</text>
   {direction==='forward'?<g className="mn4-vesicle-forward"><circle cx="210" cy="163" r="17" fill="#d8b986" stroke="#f1d8aa" strokeWidth="3"/><circle cx="206" cy="159" r="5" fill="#f4e1bf"/><path d="M235 161h24m-8-7 8 7-8 7" fill="none" stroke="#efd3a1" strokeWidth="4" strokeLinecap="round"/></g>:<g className="mn4-vesicle-back"><circle cx="572" cy="163" r="17" fill="#c38e9a" stroke="#edc0c6" strokeWidth="3"/><circle cx="568" cy="159" r="5" fill="#f4ccd5"/><path d="M549 161h-25m8-7-8 7 8 7" fill="none" stroke="#edc0c6" strokeWidth="4" strokeLinecap="round"/></g>}
   <text x="388" y="38" textAnchor="middle" fill="#f1d9b3" fontSize="20" fontWeight="600">{direction==='forward'?'Kinesin →':'← Dynein'}</text>
  </svg><div className="mn4-atlas-caption"><ArrowLeftRight size={17}/><span>{direction==='forward'?'النقل الأمامي من جسم الخلية إلى النهايات العصبية باستخدام Kinesin.':'النقل العكسي من النهايات العصبية إلى جسم الخلية باستخدام Dynein.'}</span></div>
 </div>;
}
function ActionPotentialVisual({step}:{step?:MicroStep}){
 const phases=[{name:'Resting',label:'جهد الراحة',x:118,y:232},{name:'Depolarization',label:'إزالة الاستقطاب',x:317,y:82},{name:'Repolarization',label:'إعادة الاستقطاب',x:460,y:183},{name:'After-hyperpolarization',label:'فرط الاستقطاب اللاحق',x:566,y:257}];
 const [chosen,setChosen]=useState(0);
 const forced=step?visualPhase([step.title,step.visual_focus,step.motion].join(' '),'action-potential'):undefined;
 const phase=forced??chosen;
 return <div className="mn4-atlas"><div className="mn4-atlas-top"><span><Activity size={17}/> ACTION POTENTIAL</span><span className="mn4-atlas-legend">Voltage vs Time</span></div>
  <svg className="mn4-med-svg" viewBox="0 0 760 330" role="img" aria-label="مخطط توضيحي لمنحنى جهد الفعل ومراحل الراحة وإزالة الاستقطاب وإعادة الاستقطاب وفرط الاستقطاب">
   <rect width="760" height="330" rx="16" fill="#102b2d"/><g stroke="#527268" strokeWidth="1" strokeDasharray="4 7" opacity=".65"><path d="M80 92H706M80 234H706M80 263H706M180 44V280M344 44V280M507 44V280M670 44V280"/></g>
   <path d="M80 40V280H715" stroke="#d4d8bf" strokeWidth="2.3" fill="none"/><text x="48" y="92" fill="#d7c39e" fontSize="16">+30</text><text x="42" y="234" fill="#d7c39e" fontSize="16">−70</text><text x="80" y="22" fill="#a9c4ba" fontSize="17">mV</text><text x="668" y="310" fill="#a9c4ba" fontSize="16">Time →</text>
   <path d="M95 232 L224 232 Q256 232 269 203 L311 84 Q323 51 339 82 L456 227 Q513 270 557 260 Q597 227 638 232 H700" fill="none" stroke="#8dd3b3" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
   <circle cx={phases[phase].x} cy={phases[phase].y} r="12" fill="#e6cfb7" stroke="#fff0d6" strokeWidth="3"/><circle cx={phases[phase].x} cy={phases[phase].y} r="23" stroke="#e6cfb7" strokeWidth="2" fill="none" opacity=".5"/>
  </svg><div className="mn4-phase-choices">{phases.map((p,i)=><button key={p.name} aria-pressed={phase===i} onClick={()=>setChosen(i)}><small>0{i+1}</small><strong>{p.name}</strong></button>)}</div><div className="mn4-atlas-caption"><Activity size={17}/><span>{phases[phase].label} — رسم تخطيطي، تختلف القيم الدقيقة باختلاف نوع الخلية.</span></div>
 </div>;
}
function NmjVisual({step}:{step?:MicroStep}){
 const phases=['Signal arrival','Ca²⁺ entry','Vesicle fusion','ACh release','Receptor binding','End-plate potential'];
 const [chosen,setChosen]=useState(0);
 const forced=step?visualPhase([step.title,step.visual_focus,step.motion].join(' '),'nmj'):undefined;
 const phase=forced??chosen;
 return <div className="mn4-atlas"><div className="mn4-atlas-top"><span><FlaskConical size={17}/> NEUROMUSCULAR JUNCTION</span><small>Synaptic transmission</small></div>
  <svg className="mn4-med-svg" viewBox="0 0 760 330" role="img" aria-label="الوصلة العصبية العضلية والحويصلات والأستيل كولين والمستقبلات في غشاء العضلة">
   <rect width="760" height="330" fill="#102b2d" rx="16"/><path d="M90 0V55Q90 80 124 80H540Q630 83 639 147Q645 174 614 181H120Q88 181 88 143V0" fill="#264f53" stroke="#7bc6ad" strokeWidth="3"/>
   {Array.from({length:7},(_,i)=><g key={i}><circle cx={166+i*65} cy={113+(i%2)*21} r="18" stroke="#d7b983" strokeWidth="3" fill="#735f46"/>{phase>=3&&<circle cx={166+i*65} cy={207+(i%2)*15} r="5" fill="#e6cfb7"/>}</g>)}
   <path d="M64 247 Q105 233 147 247 T230 247 T313 247 T396 247 T479 247 T562 247 T650 247 L691 248" fill="none" stroke="#dfadab" strokeWidth="7"/>
   {Array.from({length:6},(_,i)=><g key={i} transform={'translate('+(155+i*89)+' 240)'}><path d="M-16 5V30Q0 41 16 30V5" fill="#c59298" stroke="#f0c4c4" strokeWidth="2"/>{phase>=4&&<circle cy="18" r="5" fill="#f4e0ae"/>}</g>)}
   {phase===0&&<path d="M385 22v40m-12-10 12 11 12-11" stroke="#e6cfb7" strokeWidth="5" strokeLinecap="round" fill="none"/>}
   {phase===1&&<g><path d="M300 159v60m-12-14 12 14 12-14M450 159v60m-12-14 12 14 12-14" stroke="#8dd3b3" strokeWidth="4" fill="none" strokeLinecap="round"/><text x="385" y="225" textAnchor="middle" fontSize="19" fill="#e6cfb7">Ca²⁺</text></g>}
   {phase===2&&<g><circle cx="375" cy="164" r="20" fill="#d7b983" stroke="#f4dfba" strokeWidth="4"/><path d="M344 181h62" stroke="#e6cfb7" strokeWidth="5" strokeLinecap="round"/></g>}
   {phase===5&&<g><path d="M90 276H245l18-14 21 29 22-15H670" stroke="#e6cfb7" strokeWidth="4" fill="none"/><text x="385" y="294" fill="#e6cfb7" textAnchor="middle" fontSize="14">Local depolarization</text></g>}
   <text x="380" y="45" textAnchor="middle" fill="#e6cfb7" fontSize="17">Motor neuron terminal</text><text x="380" y="231" textAnchor="middle" fill="#c2d8cd" fontSize="16">Synaptic cleft</text><text x="380" y="313" textAnchor="middle" fill="#e6cfb7" fontSize="18">Muscle membrane · ACh receptors</text>
  </svg><div className="mn4-phase-choices">{phases.map((p,i)=><button key={p} aria-pressed={phase===i} onClick={()=>setChosen(i)}><small>0{i+1}</small><strong>{p}</strong></button>)}</div><div className="mn4-atlas-caption"><FlaskConical size={17}/> مخطط تعليمي للتركيب وليس تصويرًا مجهريًا أو فيديو طبيًا.</div>
 </div>;
}
export function MedicalVisual({context,sources,step}:{context:string;sources:Source[];step?:MicroStep}){
 const sourceText=sources.map(s=>s.text+' '+(s.observations||[]).map(o=>o.text).join(' ')).join(' ');
 // The current micro-step drives the figure, not a global lecture keyword.
 const kind=visualKindFor(context)!=='source'?visualKindFor(context):visualKindFor(sourceText.slice(0,2000));
 const display=kind==='axon'?<Suspense fallback={<p className="mn8-axon-caption">يجري تجهيز المجسم ثلاثي الأبعاد…</p>}><Axon3D mode={step&&visualPhase([step.title,step.visual_focus,step.motion].join(' '),'axon')===1?'retrograde':'anterograde'}/></Suspense>:kind==='nmj'?<NmjVisual step={step}/>:kind==='action-potential'?<ActionPotentialVisual step={step}/>:null;
 const p=sources.find(s=>s.image&&s.observations?.some(o=>o.kind==='diagram'||o.kind==='table'))||sources.find(s=>s.image);
 if(!display&&!p)return step?<div className="mn4-mechanism-brief" aria-label="تعليمات الحركة العلمية"><strong>المشهد العلمي لهذا الجزء</strong><p>{step.detail}</p></div>:null;
 return <div className="mn4-visual-stack">
  {display??<figure className="mn4-original-diagram"><img src={p!.image} alt={'شكل أصلي من المحاضرة، صفحة '+p!.page} loading="lazy"/><figcaption>مرجع بصري من المحاضرة الأصلية · صفحة {p!.page}</figcaption></figure>}
  {step&&(step.visual_focus||step.motion)&&<div className="mn4-visual-direction" aria-label="إخراج الخطوة في الرسوم العلمية">
    {step.visual_focus&&<div><span>FOCUS · التركيب المهم</span><strong>{step.visual_focus}</strong></div>}
    {step.motion&&<div><span>MOTION · ما الذي يتحرك أو يتغير؟</span><p>{step.motion}</p></div>}
    <small>زاوية العرض: {kind==='axon'?'3D تفاعلي':step.camera_view||'2D'} · مشهد تعليمي وليس تصويرًا طبيًا تشخيصيًا</small>
    {step.next_transition&&<p className="mn4-next-transition">انتقال المشهد: {step.next_transition}</p>}
   </div>}
 </div>;
}