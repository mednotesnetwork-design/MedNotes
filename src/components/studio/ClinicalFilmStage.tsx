import {useEffect,useState} from 'react';
import {Activity,ArrowLeft,ArrowRight,CheckCircle2,Clapperboard,ClipboardCopy,Clock3,Film,Play,ShieldAlert,Stethoscope} from 'lucide-react';
import type {ClinicalFilm,SimulationPhase} from './studio-types';

const PHASE_LABELS=['الحالة قبل الحدث','العلامات المبكرة','تصاعد الأعراض','الذروة الحرجة'] as const;
const PHASE_ENGLISH=['BASELINE','EARLY SIGNS','ESCALATION','CRITICAL PEAK'] as const;
const VITAL_LABELS={SpO2:'SpO₂',BP:'BP',HR:'HR',RR:'RR',Temperature:'Temp'} as const;
const TREND_LABELS={stable:'ثابت',increasing:'اتجاه صاعد',decreasing:'اتجاه هابط',unknown:'غير محدد'} as const;
const FREQ_LABELS={common:'شائع بحسب المصدر',variable:'قد يختلف',rare:'نادر بحسب المصدر',unknown:'الشيوع غير محدد'} as const;

function Monitor({frame}:{frame:SimulationPhase}){
 const channels=frame.vitals.filter(x=>x.display==='trend_only');
 return <div className="mn5-monitor" aria-label="بيانات المراقبة التمثيلية">
  <div className="mn5-monitor-header"><Activity size={15}/><span>CLINICAL OVERLAYS</span><small>Simulated trends — not measurements</small></div>
  {channels.length?<div className="mn5-vital-grid">{channels.map(x=><div key={x.metric} className="mn5-vital"><small>{VITAL_LABELS[x.metric]}</small><strong>{x.trend==='stable'?'—':x.trend==='increasing'?'↗':x.trend==='decreasing'?'↘':'?'}</strong><span>{TREND_LABELS[x.trend]}</span><em>لا توجد قراءة رقمية معتمدة</em></div>)}</div>:<p className="mn5-monitor-empty">لا تتوفر بيانات كافية من المحاضرة لعرض اتجاهات العلامات الحيوية. لن تُنشأ قراءات افتراضية.</p>}
 </div>;
}

export function ClinicalFilmStage({film}:{film:ClinicalFilm}){
 const [selected,setSelected]=useState(0),[showPrompt,setShowPrompt]=useState(false),[copied,setCopied]=useState(false),[copiedJson,setCopiedJson]=useState(false);
 useEffect(()=>{setSelected(0);setShowPrompt(false);setCopied(false);setCopiedJson(false);},[film]);
 const phase=film.timeline[Math.min(selected,film.timeline.length-1)];
 async function copyPrompt(){
  try{await navigator.clipboard.writeText(film.video_generation_prompt);setCopied(true);}
  catch{setShowPrompt(true);}
 }
 return <section className="mn5-film" dir="rtl" aria-label="سيناريو المحاكاة السريرية">
  <div className="mn5-title"><span><Clapperboard size={20}/> CLINICAL PRODUCTION STUDIO</span><strong>{film.condition}</strong><p>سيناريو للتصوير الطبي الواقعي، مستند إلى المحاضرة. لم يتم إنشاء فيديو بعد.</p></div>
  <div className="mn5-setting"><div><span>SETTING & ENVIRONMENT</span><h3>{film.setting.location}</h3><p>{film.setting.environment}</p></div><dl><div><dt>الوقت</dt><dd>{film.setting.time_of_day}</dd></div><div><dt>الملابس والتجهيزات</dt><dd>{film.setting.wardrobe_and_props}</dd></div><div><dt>الإضاءة وزاوية التصوير</dt><dd>{film.setting.camera_and_lighting}</dd></div><div><dt>الأصوات</dt><dd>{film.setting.soundscape}</dd></div></dl></div>
  <div className="mn5-film-warning"><ShieldAlert size={17}/><span>الدقائق التالية مدة مشاهد الفيديو، وليست توقيتًا طبيًا ثابتًا لظهور الأعراض. بعض الحالات لا تصل إلى المرحلة الحرجة.</span></div>
  <div className="mn5-film-timeline" aria-label="مراحل المشهد">{film.timeline.map((item,i)=><button key={i} onClick={()=>setSelected(i)} aria-current={selected===i?'step':undefined}><span>{String(item.screen_minute).padStart(2,'0')}:00</span><strong>{PHASE_LABELS[i]}</strong><small>{item.status==='not_applicable'?'غير منطبقة':item.status==='conditional'?'مسار محتمل فقط':PHASE_ENGLISH[i]}</small></button>)}</div>
  <div className="mn5-film-screen">
   <div className="mn5-film-screen-top"><span><Film size={17}/> {PHASE_ENGLISH[selected]}</span><span><Clock3 size={16}/> {String(phase.screen_minute).padStart(2,'0')}:00 · SCRIPT</span></div>
   {phase.status==='not_applicable'?<div className="mn5-no-critical"><ShieldAlert size={26}/><h3>لا تدعم المحاضرة تصوير هذه المرحلة</h3><p>لن نُظهر تدهورًا أو علامات خطورة غير موثقة بهدف إكمال السيناريو.</p></div>:
   <div className="mn5-film-scene"><span className="mn5-scene-kicker">{phase.status==='conditional'?'OPTIONAL COURSE · المسار ليس حتميًا':'SHOT DIRECTION'}</span><h3>{phase.scene}</h3><p>{phase.patient_performance}</p><div className="mn5-director-notes"><strong>CAMERA</strong><span>{phase.camera_direction}</span><strong>AUDIO</strong><span>{phase.environment_audio}</span></div></div>}
  </div>
  {phase.status!=='not_applicable'&&<><Monitor frame={phase}/><div className="mn5-signs"><h4><Stethoscope size={17}/> العلامات الظاهرة في هذا المشهد</h4>{phase.signs.length?phase.signs.map((x,i)=><div className="mn5-sign-row" key={i}><span>{x.sign}</span><small>{FREQ_LABELS[x.frequency]}</small><em>Source {x.evidence_id}</em></div>):<p>لا توجد علامات مرضية إضافية موثقة لهذه المرحلة.</p>}</div></>}
  <div className="mn5-meaning"><h4>Clinical reasoning</h4><p>{phase.medical_explanation}</p></div>
  <div className="mn5-film-controls"><button disabled={selected===0} onClick={()=>setSelected(i=>i-1)}><ArrowRight size={17}/> السابق</button><span>{selected+1} / {film.timeline.length}</span><button disabled={selected===film.timeline.length-1} onClick={()=>setSelected(i=>i+1)}>المشهد التالي <ArrowLeft size={17}/></button></div>
  <details className="mn5-medical-caveats"><summary>قواعد الواقعية الطبية وتفاوت الأعراض</summary>{film.clinical_caveats.map((s,i)=><p key={'c'+i}>{s}</p>)}{film.not_universal.map((s,i)=><p key={'u'+i}>{s}</p>)}<p>المحتوى تعليمي فقط، ويستلزم مراجعة بشرية قبل نشره بوصفه محاكاة سريرية موثوقة.</p></details>
  <div className="mn5-prompt"><div><strong>VIDEO GENERATION PROMPT</strong><p>نص إنتاج جاهز للاستخدام مع نموذج فيديو خارجي؛ لا يتضمن ملف فيديو أو تشغيلًا وهميًا.</p></div><button type="button" onClick={()=>{void copyPrompt();}}>{copied?<CheckCircle2 size={16}/>:<ClipboardCopy size={16}/>} {copied?'تم نسخ البرومبت':'نسخ برومبت الفيديو'}</button><button type="button" onClick={()=>{void navigator.clipboard.writeText(JSON.stringify(film,null,2)).then(()=>setCopiedJson(true)).catch(()=>setShowPrompt(true));}}><ClipboardCopy size={16}/>{copiedJson?'تم نسخ JSON':'نسخ السيناريو JSON'}</button><button type="button" onClick={()=>setShowPrompt(v=>!v)}>{showPrompt?'إخفاء النص':'عرض نص الإنتاج'}</button>{showPrompt&&<textarea dir="auto" readOnly rows={10} aria-label="برومبت إنتاج الفيديو الطبي" value={film.video_generation_prompt} onFocus={e=>e.currentTarget.select()}/>}</div>
  <p className="mn5-disclaimer">ليس فيديو مولّدًا، وليس أداة تشخيص أو تدبير علاجي. المراجعة الآلية لا تساوي اعتمادًا طبيًا بشريًا.</p>
 </section>;
}