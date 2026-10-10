import type {Explanation} from './types';

/** A schematic learning figure. Layers and molecules are displayed only when
 * terms appear in an independently reviewed lesson, not hallucinated labels.
 * The drawing is never advertised as the original source's anatomical scale. */
export function SourceAwareNMJ({lesson}:{lesson:Explanation}){
 const supported=[
  lesson.explanation,...lesson.source_quotes,...(lesson.visual?.source_quotes||[]),
  ...(lesson.visual?.labels||[]).flatMap(x=>[x.label,x.detail]),
  ...(lesson.clinical_layers?.mechanism.steps||[]).map(x=>x.text)
 ].join(' ');
 const ach=/\bACh\b|acetylcholine|أستيل\s*كولين/i.test(supported);
 const calcium=/\bCa\b|Ca²|calcium|الكالسيوم|كالسيوم/i.test(supported);
 const vesicles=/vesicl|حويصل|إفراز|release/i.test(supported)&&ach;
 const receptors=/\bNm\b|receptor|مستقبل/i.test(supported)&&ach;
 return <figure className="atlas-nmj-figure" aria-label="رسم تعليمي توضيحي للوصلة العصبية العضلية">
  <div className="atlas-nmj-head"><span>FIGURE / NEUROMUSCULAR TRANSMISSION</span><span>SCHEMATIC · NOT TO SCALE</span></div>
  <svg viewBox="0 0 720 330" role="img" aria-label="Presynaptic terminal above muscle membrane with only source-supported labels" preserveAspectRatio="xMidYMid meet">
   <defs>
    <linearGradient id="nmj-nerve-gradient" x1="0" x2="1">
     <stop offset="0%" stopColor="#c9ede4"/><stop offset="100%" stopColor="#e8f5ef"/>
    </linearGradient>
   </defs>
   <rect width="720" height="330" rx="12" fill="#fbfaf6"/>
   <path d="M245 0 L245 61 M473 0 L473 61" stroke="#66b9ac" strokeWidth="3" opacity=".25"/>
   <rect x="125" y="48" width="470" height="111" rx="55" fill="url(#nmj-nerve-gradient)" stroke="#27b2a3" strokeWidth="3"/>
   <text x="360" y="75" fontFamily="sans-serif" fontWeight="700" fontSize="15" fill="#007f74" textAnchor="middle">PRESYNAPTIC TERMINAL</text>
   {vesicles&&[210,287,363,439,511].map((x,i)=><g key={i}>
    <circle cx={x} cy={120} r="16" fill="#f7d881" stroke="#cea24b" strokeWidth="2"/>
    <circle cx={x-5} cy="117" r="2.5" fill="#c28e25"/><circle cx={x+4} cy="122" r="2.5" fill="#c28e25"/>
   </g>)}
   {calcium&&<g>
    <text x="588" y="24" textAnchor="end" fontSize="15" fill="#977119">Ca²⁺</text>
    <path d="M588 29 Q555 36 528 75" fill="none" stroke="#d2aa3a" strokeWidth="2" strokeDasharray="5 6"/>
   </g>}
   {ach&&[0,1,2,3,4,5,6,7,8].map((i)=><circle key={i} cx={275+(i%5)*41} cy={179+Math.floor(i/5)*22+(i%2)*6} r="5.2" fill="#e3af2e"/>)}
   <path d="M65 244 Q180 227 300 244 T540 244 T665 244" fill="none" stroke="#d97b8d" strokeWidth="10" strokeLinecap="round"/>
   <path d="M65 250 Q210 268 380 250 T665 250 L665 310 L65 310Z" fill="#f7e5e6" opacity=".75"/>
   {receptors&&[260,358,458].map((x,i)=><g key={i}>
    <rect x={x-10} y="225" width="20" height="35" rx="4" fill="#8f72bc" stroke="#664992" strokeWidth="2"/>
    <path d={`M${x} 224 v-13`} stroke="#664992" strokeWidth="3"/>
   </g>)}
   <text x="360" y="300" fontSize="15" fontWeight="700" fontFamily="sans-serif" fill="#b65b72" textAnchor="middle">MUSCLE MEMBRANE</text>
   {ach&&<g>
    <path d="M480 183 H608" stroke="#d7a52d" strokeWidth="2" fill="none"/>
    <text x="614" y="188" fontFamily="sans-serif" fontSize="14" fill="#a17a1d">ACh</text>
   </g>}
   {receptors&&<g>
    <path d="M458 255 L546 284 H646" stroke="#926bb5" strokeWidth="2" fill="none"/>
    <text x="653" y="283" fontFamily="sans-serif" fontSize="12" fill="#825da0" textAnchor="end">ACh receptors</text>
   </g>}
  </svg>
  <figcaption>مخطط تعليمي مبسّط لتوضيح العلاقة بين طرف العصب والغشاء العضلي. التفاصيل المعروضة تتبع المصطلحات التي ظهرت في الشرح المراجَع، وليس رسمًا مقياسيًا أو نسخة من محاضرتك الأصلية.</figcaption>
 </figure>;
}
