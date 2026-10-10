import {useEffect,useId,useState} from 'react';
import type {Explanation} from './types';
export type MechanismStep={id:string;title:string;quote:string;detail:string;stage:number};
/** Select only explicit source sentences; do not synthesize a missing causal link. */
export function mechanismSteps(source:string,lesson?:Explanation):MechanismStep[]{
 const sentences=source.split(/(?<=[.!؟])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
 const definitions:[string,string,RegExp,number][]=[
  ['arrival','الإشارة العصبية',/action potential.*(?:arriv|reach|terminal)|(?:وصول|يصل).*جهد الفعل/i,0],
  ['influx','الكالسيوم في النهاية العصبية',/(?:calcium|Ca²?\+?).*(?:enter|influx|terminal)|(?:دخول|يدخل).*كالسيوم/i,1],
  ['release','إفراز Acetylcholine',/(?:acetylcholine|\bACh\b).*(?:releas|secret)|(?:releas|secret).*(?:acetylcholine|\bACh\b)|إفراز.*(?:أستيل|استيل)/i,2],
  ['receptor','الارتباط بالمستقبلات',/(?:acetylcholine|\bACh\b).*(?:bind|receptor)|(?:يرتبط|ارتباط).*(?:مستقبل|أستيل)/i,3],
  ['tubule','انتقال الإشارة داخل الليف',/t[ -]?tubul|الأنابيب المستعرضة/i,4],
  ['sr','الكالسيوم داخل الليف العضلي',/sarcoplasmic reticulum.*(?:releas|calcium)|(?:releas|calcium).*sarcoplasmic reticulum|الشبكة الساركوبلازمية/i,5],
  ['troponin','تنظيم الخيوط العضلية',/troponin|tropomyosin|تروبونين|تروبومايوسين/i,6],
  ['bridge','الجسور العرضية',/cross[ -]?bridge|myosin.*(?:actin|ATP)|الجسور العرضية/i,7],
  ['slide','انزلاق الخيوط',/sliding|filaments.*slide|sarcomere.*shorten|انزلاق الخيوط/i,8],
  ['reset','إنهاء الإشارة والارتخاء',/acetylcholinesterase|SERCA|relaxation|ارتخاء/i,9]
 ];
 const reviews=[...(lesson?.mechanism||[]).map(s=>({quote:s.source_quote,detail:s.detail||s.label})),...(lesson?.coverage||[]).map(c=>({quote:'',detail:c.explanation}))];
 return definitions.flatMap(([id,title,pattern,stage])=>{
  const quote=sentences.find(s=>pattern.test(s)&&!/(?:does not|cannot|blocked|inhibit|لا يحدث|يمنع|يثبط)/i.test(s));
  if(!quote)return [];
  const detail=reviews.find(r=>r.quote&&quote.includes(r.quote))?.detail||quote;
  return [{id,title,quote,detail,stage}];
 });
}
export function MechanismPlayer({source,lesson}:{source:string;lesson?:Explanation}){
 const steps=mechanismSteps(source,lesson),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),uid=useId().replace(/:/g,'');
 useEffect(()=>{setIndex(0);setPlaying(false);},[source]);
 useEffect(()=>{
  if(!playing||steps.length<2)return;
  const timer=setInterval(()=>setIndex(i=>{if(i>=steps.length-1){setPlaying(false);return i;}return i+1;}),4500/speed);
  return()=>clearInterval(timer);
 },[playing,speed,steps.length]);
 if(steps.length<2||!/(neuromuscular|motor end plate|acetylcholine|sarcomere|الوصلة العصبية|انقباض العضل)/i.test(source))return null;
 const active=steps[Math.min(index,steps.length-1)],stage=active.stage;
 const has=(id:string)=>steps.some(s=>s.id===id),muscle=stage>=4&&stage<=8,shift=stage===8?30:0;
 return <section className={'mechanism-player '+(playing?'is-playing':'is-paused')} aria-label="محاكاة انتقال الإشارة وانقباض العضلة" data-no-swipe>
  <header><span>INTERACTIVE MECHANISM</span><h3>شاهدي الآلية خطوة بخطوة</h3><p>محاكاة تخطيطية غير مقياسية، تعرض الخطوات الصريحة في مصدرك. الأجزاء غير المذكورة لا تُستكمل بالتخمين.</p></header>
  <svg viewBox="0 0 960 490" role="img" aria-label={active.title}>
   <defs><linearGradient id={uid+'nerve'} x2="0" y2="1"><stop stopColor="#c0e5d6"/><stop offset="1" stopColor="#7fb9a9"/></linearGradient><linearGradient id={uid+'muscle'} x2="0" y2="1"><stop stopColor="#f3dad4"/><stop offset="1" stopColor="#d59a98"/></linearGradient></defs>
   <rect width="960" height="490" rx="20" fill="#faf7f0"/>
   {!muscle?<>
    <path d="M380 0 V85 C380 111 210 110 210 190 Q210 270 480 270 Q750 270 750 190 C750 110 580 111 580 85 V0" fill={`url(#${uid}nerve)`} stroke="#3b8071" strokeWidth="3"/>
    <text x="480" y="85" textAnchor="middle" fill="#244d43" fontSize="23">Nerve terminal</text>
    {stage===0&&<path className="signal-pulse" d="M450 18 L478 41 462 56 493 80" fill="none" stroke="#bd8d32" strokeWidth="10"/>}
    {has('influx')&&<g opacity={stage===1?1:.35}><circle className={stage===1?'ion-influx':''} cx="170" cy="174" r="19" fill="#d9ae51"/><text x="111" y="151" fontSize="21" fill="#785b24">Ca²⁺</text><path d="M155 190 L225 209" stroke="#a47724" strokeWidth="3"/></g>}
    {has('release')&&[0,1,2,3].map(i=><g key={i} className={stage===2?'vesicle-release':''} style={{animationDelay:`${i*.16}s`}}><circle cx={342+i*88} cy="193" r="29" fill="#ebcb80" stroke="#9d772c" strokeWidth="2"/>{[0,1,2].map(j=><circle key={j} cx={330+i*88+j*11} cy={190+j%2*10} r="4" fill="#866421"/>)}</g>)}
    <path d="M55 361 H310 V397 H340 V361 H465 V397 H495 V361 H620 V397 H650 V361 H905 V475 H55Z" fill={`url(#${uid}muscle)`} stroke="#ad6c76" strokeWidth="4"/>
    <text x="480" y="448" textAnchor="middle" fill="#70424c" fontSize="23">Muscle membrane</text>
    {has('release')&&[0,1,2,3,4,5,6,7].map(i=><circle key={i} className={stage===2||stage===3?'transmitter-motion':''} cx={335+i*42} cy={stage===3?331:298+(i%2)*22} r="7" fill="#bc8929" opacity={stage>=2&&stage<=3?1:.13} style={{animationDelay:`${i*.11}s`}}/>)}
    {has('receptor')&&[330,485,640].map(x=><g key={x}><path d={`M${x-15} 350 V373 M${x+15} 350 V373`} stroke={stage===3?'#3b8071':'#856470'} strokeWidth="11"/><circle cx={x} cy="341" r="8" fill={stage===3?'#bb923c':'#ead9cf'}/></g>)}
    <text x="795" y="311" fontSize="20" fill="#876424">{stage===9&&has('reset')?'Signal ends':has('release')?'ACh':''}</text>
   </>:<>
    <rect x="80" y="90" width="800" height="310" rx="80" fill={`url(#${uid}muscle)`} stroke="#a56c73" strokeWidth="3"/>
    <path d="M255 90 V220 Q255 256 285 256 Q315 256 315 220 V90" fill="#faf7f0" stroke="#83555e" strokeWidth="5"/>
    {stage===4&&<circle className="tubule-signal" cx="285" cy="130" r="12" fill="#dab454"/>}
    {has('sr')&&<><path d="M360 131 Q460 90 790 145 M360 359 Q535 405 790 355" fill="none" stroke="#719f96" strokeWidth="23"/><text x="587" y="84" textAnchor="middle" fontSize="22" fill="#426e63">Sarcoplasmic reticulum</text></>}
    {has('sr')&&[0,1,2,3,4,5].map(i=><circle key={i} className={stage===5?'calcium-motion':''} cx={400+i*65} cy={176+(i%2)*130} r="7" fill="#b89735" opacity={stage>=5?1:.2} style={{animationDelay:`${i*.12}s`}}/>)}
    {(has('troponin')||has('bridge')||has('slide'))&&<g>
     <path d="M370 218 H800 M370 283 H800" stroke="#698f8b" strokeWidth="9"/>
     <g style={{transform:`translateX(${shift}px)`,transition:'transform 1.3s ease'}}><path d="M377 240 H690" stroke="#975f6c" strokeWidth="14"/><path d="M430 237 l13 -18 M505 237 l13 -18 M580 237 l13 -18 M655 237 l13 -18" stroke="#975f6c" strokeWidth="7" style={{opacity:stage>=7?1:.25}}/></g>
     {stage===6&&[425,510,595,680,765].map(x=><circle key={x} cx={x} cy="217" r="11" fill="#d9b24b"/>)}
     <text x="570" y="330" textAnchor="middle" fill="#70424c" fontSize="20">{stage===8?'Filament sliding':stage===7?'Cross-bridges':active.title}</text>
    </g>}
    <text x="190" y="439" fontSize="21" fill="#70424c">Muscle fiber</text>
   </>}
   <rect x="25" y="20" width="225" height="39" rx="18" fill="#17423a"/><text x="137" y="47" textAnchor="middle" fontSize="18" fill="#f7f3e8">STEP {index+1} / {steps.length}</text>
  </svg>
  <div className="mechanism-controls"><button onClick={()=>setPlaying(v=>!v)} aria-pressed={playing}>{playing?'إيقاف مؤقت':'تشغيل المحاكاة'}</button><button onClick={()=>{setPlaying(false);setIndex(0);}}>من البداية</button><label>السرعة <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option></select></label></div>
  <div className="mechanism-step-list">{steps.map((step,i)=><button key={step.id} aria-pressed={i===index} onClick={()=>{setPlaying(false);setIndex(i);}}>{i+1}. {step.title}</button>)}</div>
  <div className="mechanism-caption" aria-live="polite"><h4>{active.title}</h4><p dir="auto">{active.detail}</p><details><summary>الدليل من المحاضرة</summary><blockquote dir="auto">{active.quote}</blockquote></details></div>
 </section>;
}
