import {useRef,useState} from 'react';
import Viewer,{type ViewerHandle} from '@atlas/components/anatomy/Viewer';
import {byId,nerve} from '@atlas/lib/anatomy';
import {initialView,type ViewState} from '@atlas/lib/state/viewer';

/** Shares the atlas renderer and curated geometry; no generated replacement anatomy. */
export default function InlineAnatomy({ids,supplemental=false}:{ids:string[];supplemental?:boolean}){
 const [selected,setSelected]=useState(ids[0]),[focusTick,setFocusTick]=useState(1),[trace,setTrace]=useState(false),[angle,setAngle]=useState<ViewState['cameraView']>('anterior');
 const viewer=useRef<ViewerHandle>(null);
 const entity=byId.get(selected);
 const state:ViewState={...initialView,selectedId:selected,focusId:selected,focusTick,traceId:trace?selected:null,cameraView:angle,visibleSystems:['bone',entity?.system||'nerve'],fade:true,opacity:1,mode:'explore'};
 return <section className="lesson-anatomy" aria-label="3D مرتبط بالشرح">
  <label>التركيب المرتبط بالسلايد<select value={selected} onChange={e=>{setSelected(e.target.value);setFocusTick(n=>n+1);}}>{[...new Set([...ids,selected])].map(id=><option key={id} value={id}>{byId.get(id)?.name||id}</option>)}</select></label>
  <div className="lesson-anatomy-scene"><Viewer ref={viewer} state={state} onSelect={id=>{if(ids.includes(id)){setSelected(id);setFocusTick(n=>n+1);}}} onProgress={()=>{}}/></div>
  <div className="lesson-scene-controls"><button onClick={()=>viewer.current?.zoom(.8)} aria-label="تكبير النموذج">+</button><button onClick={()=>viewer.current?.zoom(1.25)} aria-label="تصغير النموذج">−</button><button onClick={()=>viewer.current?.focus(selected)}>تركيز</button><button onClick={()=>setAngle(v=>v==='anterior'?'posterior':'anterior')}>الجهة المقابلة</button></div>
  {entity?.system==='nerve'&&<button aria-pressed={trace} onClick={()=>setTrace(v=>!v)}>{trace?'إخفاء التتبع':'تتبّع الفروع المتاحة'}</button>}
  {supplemental&&entity&&<details className="atlas-reference"><summary>مرجع الأطلس · معلومات إضافية خارج المحاضرة</summary><p>{entity.description}</p>{Object.entries(entity.fields).map(([label,value])=><div key={label}><strong>{label}</strong><p>{Array.isArray(value)?value.join(' · '):String(value)}</p></div>)}{entity.system==='nerve'&&<><strong>العضلات المرتبطة</strong><div className="lesson-scene-controls">{nerve(entity).motorIds.map(id=><button key={id} onClick={()=>{setSelected(id);setFocusTick(n=>n+1);}}>{byId.get(id)?.name||id}</button>)}</div></>}</details>}
  <small>اسحبي للدوران · نموذج الأطلس المرجعي، وليس صورة مستخرجة من المحاضرة. {entity?.assetIds.length?'الهندسة من مصادر الأطلس؛ المراجعة التشريحية المستقلة غير مكتملة.':'هذا التركيب لا يملك مجسّمًا مستقلًا؛ يظهر السياق المتاح فقط.'}</small>
 </section>;
}
