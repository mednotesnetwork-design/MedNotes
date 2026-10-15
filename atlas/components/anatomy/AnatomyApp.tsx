'use client';
import { useState,useReducer,useRef,useCallback,useEffect } from 'react';
import { Search,Layers,Bone,Activity,GitBranch,Droplets,Stethoscope,GraduationCap,ScanLine,Focus,Plus,Minus,RotateCcw,PanelLeftClose,PanelLeftOpen,ArrowUpRight,Info,ChevronRight,BookOpen,X } from 'lucide-react';
import { byId,entities,assets,nameOf,systemLabels,colors,muscle,nerve,landmarkAnnotations } from '@atlas/lib/anatomy';
import { viewReducer,initialView,type Mode,type ViewState } from '@atlas/lib/state/viewer';
import Viewer,{type ViewerHandle} from './Viewer';
import AnatomyInfo from './AnatomyInfo';
import PlexusGraph from './PlexusGraph';
import VascularTree from './VascularTree';
import QuizPanel,{type QuizHandle} from './QuizPanel';
import { MovementControls,ClinicalControls } from './StudyControls';
import type { Question } from '@atlas/lib/quiz/engine';
import { Sheet,SheetContent,SheetTitle,SheetDescription } from '@atlas/components/ui/sheet';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@atlas/components/ui/dialog';
import { Tabs,TabsList,TabsTrigger } from '@atlas/components/ui/tabs';
import AnatomySearch from './AnatomySearch';
import LayerManager from './LayerManager';
import { layerOf } from '@atlas/lib/state/visibility';
import { Tooltip,TooltipContent,TooltipTrigger,TooltipProvider } from '@atlas/components/ui/tooltip';
import Link from '@atlas/Link';
const modes=[['explore','Explore',ScanLine],['attachments','Attachments',Bone],['movement','Movement',Activity],['nerves','Nerves',GitBranch],['vasculature','Vessels',Droplets],['clinical','Clinical',Stethoscope],['quiz','Quiz',GraduationCap]] as const;
function restoreAtlasView(fallback:ViewState):ViewState{
 try{
  const saved=JSON.parse(sessionStorage.getItem('mednote-atlas-view')||'null');
  if(!saved||typeof saved!=='object'||!modes.some(([mode])=>mode===saved.mode))return fallback;
  const restored={...fallback};
  for(const key of ['visibleSystems','hiddenIds','isolateRevealIds','ghostIds','transparentIds'] as const){if(Array.isArray(saved[key])&&saved[key].every((v:unknown)=>typeof v==='string'))restored[key]=saved[key];}
  for(const key of ['selectedId','focusId','isolateId','boneStudyId','traceId'] as const)if(typeof saved[key]==='string'&&byId.has(saved[key]))restored[key]=saved[key];
  if(['overview','landmarks','attachments','ligaments','joints','neurovascular','clinical'].includes(saved.boneMode))restored.boneMode=saved.boneMode;
  if(['origin','insertion','both'].includes(saved.attachmentKind))restored.attachmentKind=saved.attachmentKind;
  if(['anterior','posterior','lateral'].includes(saved.cameraView))restored.cameraView=saved.cameraView;
  if(typeof saved.opacity==='number'&&saved.opacity>=0&&saved.opacity<=1)restored.opacity=saved.opacity;
  return {...restored,mode:saved.mode==='quiz'?'explore':saved.mode,playing:false};
 }catch{return fallback;}
}
export default function AnatomyApp(){
 const [s,dispatch]=useReducer(viewReducer,initialView,restoreAtlasView),[query,setQuery]=useState(''),[system,setSystem]=useState('all'),[browserOpen,setBrowserOpen]=useState(true),[mobileBrowser,setMobileBrowser]=useState(false),[mobileInfo,setMobileInfo]=useState(false),[layerOpen,setLayerOpen]=useState(false),[about,setAbout]=useState(false),[progress,setProgress]=useState(0),[nervesView,setNervesView]=useState('plexus'),[vesselsView,setVesselsView]=useState('tree'),[vascularSystem,setVascularSystem]=useState<'artery'|'vein'>('artery');
 useEffect(()=>{try{sessionStorage.setItem('mednote-atlas-view',JSON.stringify({...s,playing:false,past:[],future:[],quizConcealed:false,quizPoint:false}));}catch{}},[s]);
 const viewer=useRef<ViewerHandle>(null);const quizRef=useRef<QuizHandle>(null);
 const patch=useCallback((patch:Partial<ViewState>)=>dispatch({type:'patch',patch}),[]);
 const selected=byId.get(s.selectedId??'')??null;
 const changeMode=useCallback((mode:Mode)=>{
  setMobileInfo(false);setLayerOpen(false);setQuery('');
  const next:Partial<ViewState>={mode,boneStudyId:null,boneMode:'overview',traceId:null,playing:false,progress:0,quizConcealed:false,quizPoseId:null,quizPoint:false};
  if(mode==='movement'){next.selectedId=s.movementId;next.region='All regions';}
  if(mode==='clinical'){next.visibleSystems=[...new Set([...s.visibleSystems,'clinical'])];next.selectedId=s.clinicalId;next.abnormal=assets.some(a=>a.role==='clinical-specimen'&&a.entityId===s.clinicalId);next.region='All regions';}
  if(mode==='nerves'){next.selectedId='root-c5';setNervesView('plexus');}
  if(mode==='vasculature'){next.selectedId='axillary-artery';setVascularSystem('artery');}
  if(mode==='attachments'){next.selectedId=selected?.system==='muscle'?selected.id:'supraspinatus';}
  patch(next);
 },[s.movementId,s.clinicalId,s.visibleSystems,selected,patch]);
 const select=useCallback((id:string)=>{
  const e=byId.get(id);if(!e)return;
  if(s.mode==='quiz'){quizRef.current?.point(id);return;}
  dispatch({type:'select',id,system:layerOf(e)});setMobileBrowser(false);
  if(e.system==='bone')patch({boneStudyId:id,boneMode:'overview',mode:'explore'});
  else if(e.system==='landmark')patch({boneStudyId:e.relations.find(r=>r.type==='landmark of')?.targetId??null,boneMode:'landmarks',mode:'explore'});
  else if(!['muscle'].includes(e.system))patch({boneStudyId:null});
  if(e.system==='clinical'){patch({mode:'clinical',clinicalId:id,abnormal:assets.some(a=>a.role==='clinical-specimen'&&a.entityId===id),playing:false,progress:0});}
  else if(e.system==='movement'){patch({mode:'movement',movementId:id,playing:false,progress:0});}
  else if(e.system==='nerve'){patch({mode:'nerves'});setNervesView('3d');}
  else if(e.system==='artery'||e.system==='vein'){patch({mode:'vasculature'});setVascularSystem(e.system);setVesselsView('3d');}
  else if(e.system==='muscle')patch({mode:s.mode==='attachments'?'attachments':'explore',boneStudyId:null});
  else patch({mode:'explore'});
 },[s.mode,patch]);
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get('structure');if(id&&byId.has(id)){select(id);dispatch({type:'focus',id});}},[]);
 const onAction=useCallback((action:string,id:string)=>{
  const e=byId.get(id);if(!e)return;
  if(action==='trace'){patch({traceId:id});if(e.system==='nerve')setNervesView('plexus');else setVesselsView('tree');}
  else if(action==='focus')dispatch({type:'focus',id});
  else if(action==='isolate')dispatch({type:'objects',ids:[id],systems:[layerOf(e)],operation:'isolate'});
  else if(action==='ghost'||action==='transparent'||action==='restore')dispatch({type:'objects',ids:[id],systems:[layerOf(e)],operation:action});
  else if(action==='hide')dispatch({type:'hide',id});
  else if(['origin','insertion','both'].includes(action)){patch({mode:'attachments',selectedId:id,attachmentKind:action as 'origin'|'insertion'|'both',boneStudyId:null});}
  else if(action==='attachments'){changeMode('attachments');patch({selectedId:id});}
  else if(action==='movement'){const mid=muscle(e).movementIds?.[0];if(mid)select(mid);}
  else if(action==='nerves'){const n=muscle(e).nerveIds?.[0];if(n)select(n);}
  else if(action==='vasculature'){const a=muscle(e).arteryIds?.[0];if(a)select(a);}
 },[s.isolateId,patch,changeMode,select]);
 const onQuestion=useCallback((q:Question)=>{patch({quizConcealed:true,quizPoint:q.kind==='point',quizPoseId:q.poseId??null,quizTarget:q.targetId,selectedId:null,playing:false,progress:1,abnormal:true,focusId:q.kind==='point'?null:q.targetId,focusTick:Date.now()});},[patch]);
 const onReveal=useCallback((q:Question)=>{patch({quizConcealed:false,selectedId:q.contextId});},[patch]);
 const isGraph=(s.mode==='nerves'&&nervesView==='plexus')||(s.mode==='vasculature'&&vesselsView==='tree');
 function handleCamera(action:string){if(action==='in')viewer.current?.zoom(.8);else if(action==='out')viewer.current?.zoom(1.25);else if(action==='fit')viewer.current?.focus(null);else dispatch({type:'reset'});}
 const panel=<AnatomyInfo entity={selected} onSelect={select} onAction={onAction} isolated={s.isolateId===selected?.id} boneMode={s.boneMode} onBoneMode={boneMode=>patch({boneMode,boneStudyId:selected?.system==='bone'?selected.id:s.boneStudyId})}/>;
 const browser=<div className="structure-browser"><div className="browser-heading"><span className="eyebrow">ANATOMY ATLAS</span><button className="icon-button desktop-only" aria-label="Collapse structure browser" onClick={()=>setBrowserOpen(false)}><PanelLeftClose size={17}/></button></div>
  <AnatomySearch query={query} onQuery={setQuery} system={system} onSystem={setSystem} region={s.region} onRegion={region=>patch({region})} selectedId={s.selectedId} onSelect={select}/>
 </div>;
 return <TooltipProvider delayDuration={250}><div className="mednote-app"><header className="app-header"><Link href="/" className="brand" aria-label="MedNote anatomy home"><span className="brand-symbol"><Activity size={23} strokeWidth={1.5}/></span><strong>MedNote<span>ANATOMY</span></strong></Link><div className="atlas-title"><span>ATLAS</span><ChevronRight size={14}/>Upper limb</div><button aria-label="Atlas notes" className="about-button" onClick={()=>setAbout(true)}><BookOpen size={16}/><span>Atlas notes</span></button></header>
  <nav className="mode-nav" aria-label="Study modes"><Tabs value={s.mode} onValueChange={v=>changeMode(v as Mode)}><TabsList variant="line" className="mode-tabs">{modes.map(([id,label,Icon])=><TabsTrigger key={id} value={id}><Icon size={17}/><span>{label}</span></TabsTrigger>)}</TabsList></Tabs><span className="edition-label">UPPER LIMB STUDY</span></nav>
  <main className={'workspace '+(!browserOpen?'browser-collapsed ':'')+(s.mode==='quiz'?'quiz-workspace':'')}>
   {s.mode!=='quiz'&&browserOpen&&<aside className="desktop-browser">{browser}</aside>}
   <section className="anatomy-stage" aria-label="Anatomy workspace"><div className="stage-topbar"><div className="stage-heading"><div className="eyebrow">{s.mode==='quiz'?'TEST YOUR KNOWLEDGE':s.mode==='clinical'?'ANATOMY IN PRACTICE':'THE UPPER LIMB'}</div><h1>{s.mode==='quiz'?'Anatomy practice':s.mode==='clinical'?nameOf(s.clinicalId):s.mode==='movement'?nameOf(s.movementId):s.mode==='nerves'?'Nervous system':s.mode==='vasculature'?(vascularSystem==='artery'?'Arterial system':'Venous system'):s.region==='All regions'?'Available anatomy':s.region}</h1></div><div className="stage-actions">{s.mode!=='quiz'&&<><button className="icon-button mobile-only" aria-label="Open anatomy search" onClick={()=>setMobileBrowser(true)}><Search size={18}/></button>{!browserOpen&&<button className="icon-button desktop-only" aria-label="Open structure browser" onClick={()=>setBrowserOpen(true)}><PanelLeftOpen size={18}/></button>}<button className={'icon-button '+(layerOpen?'active':'')} aria-label="Visible systems and opacity" onClick={()=>setLayerOpen(v=>!v)}><Layers size={19}/></button></>}</div></div>
    {s.mode==='nerves'&&<div className="stage-subnav"><Tabs value={nervesView} onValueChange={setNervesView}><TabsList><TabsTrigger value="plexus">Plexus map</TabsTrigger><TabsTrigger value="3d">3D relationships</TabsTrigger><TabsTrigger value="sensory">Sensory territories</TabsTrigger></TabsList></Tabs></div>}
    {s.mode==='vasculature'&&<div className="stage-subnav vascular-subnav"><Tabs value={vascularSystem} onValueChange={v=>{setVascularSystem(v as 'artery'|'vein');select(v==='artery'?'axillary-artery':'cephalic-vein');}}><TabsList><TabsTrigger value="artery">Arteries</TabsTrigger><TabsTrigger value="vein">Veins</TabsTrigger></TabsList></Tabs><Tabs value={vesselsView} onValueChange={setVesselsView}><TabsList><TabsTrigger value="3d">3D</TabsTrigger><TabsTrigger value="tree">Trace tree</TabsTrigger></TabsList></Tabs></div>}
    <div className={'scene-wrap '+(s.mode==='movement'||s.mode==='clinical'?'with-console':'')}>
     <div className={'persistent-viewer '+(isGraph||(s.mode==='nerves'&&nervesView==='sensory')?'view-covered':'')}><Viewer ref={viewer} state={s} onSelect={select} onProgress={setProgress}/></div>
     {isGraph&&(s.mode==='nerves'?<PlexusGraph selectedId={s.selectedId} onSelect={select} direction={s.traceDirection} onDirection={traceDirection=>patch({traceDirection,traceId:s.selectedId})}/>:<VascularTree selectedId={s.selectedId} onSelect={select} system={vascularSystem} direction={s.traceDirection} onDirection={traceDirection=>patch({traceDirection,traceId:s.selectedId})}/>)}
     {s.mode==='nerves'&&nervesView==='sensory'&&<SensoryPanel onSelect={select}/>}
     {!isGraph&&!(s.mode==='nerves'&&nervesView==='sensory')&&<><div className="camera-views" aria-label="View orientation">{(['anterior','posterior','lateral'] as const).map(v=><button key={v} className={s.cameraView===v?'active':''} onClick={()=>patch({cameraView:v})}>{v==='anterior'?'View 1':v==='posterior'?'Opposite':'Side view'}</button>)}</div>
      <div className="camera-tools">{([{Icon:Plus,label:'Zoom in',action:'in'},{Icon:Minus,label:'Zoom out',action:'out'},{Icon:Focus,label:'Fit anatomy',action:'fit'},{Icon:RotateCcw,label:'Reset view',action:'reset'}]).map(({Icon,label,action})=><Tooltip key={action}><TooltipTrigger asChild><button className="icon-button" aria-label={label} onClick={()=>handleCamera(action)}><Icon size={18}/></button></TooltipTrigger><TooltipContent side="left">{label}</TooltipContent></Tooltip>)}</div>
      <div className="viewer-hint"><span>Drag to rotate</span><i/>Pinch or scroll to zoom<i/>Tap to select</div>
      {s.mode==='explore'&&selected&&selected.assetIds.length===0&&<div className="context-notice"><Info size={15}/>{landmarkAnnotations.has(selected.id)?'Source landmark annotation · surface extent is not segmented':`Related anatomy shown · exact ${selected.system} asset pending`}</div>}
      {s.mode==='nerves'&&<div className="context-notice"><Info size={15}/>{selected?.assetIds.length?'Eligible nerve geometry · anatomical review pending.':'This nerve segment has no source geometry yet. Use the plexus map to trace connections.'}</div>}
     </>}
    </div>
    {s.mode==='movement'&&<MovementControls state={s} patch={patch} onSelect={select} progress={progress}/>}
    {s.mode==='clinical'&&<ClinicalControls state={s} patch={patch} onSelect={select} progress={progress}/>}

    <div className="stage-footer"><span>3D · Right upper limb</span><button onClick={()=>setAbout(true)}>Review status <Info size={13}/></button></div>
   </section>
   <aside className={'anatomy-panel '+(s.mode==='quiz'?'quiz-panel-wrap':'desktop-info')}>{s.mode==='quiz'?<QuizPanel onQuestion={onQuestion} onReveal={onReveal} ref={quizRef}/>:panel}</aside>
  </main>
  {s.mode!=='quiz'&&<button className="mobile-info-bar" onClick={()=>setMobileInfo(true)}><span className="system-mark" style={{background:colors[selected?.system??'bone']}}/><span><small>{selected?systemLabels[selected.system]:'ANATOMY'}</small><strong>{selected?.name??'Select a structure'}</strong></span><span className="details-word">Details</span><ChevronRight size={18}/></button>}
  <Sheet open={layerOpen} onOpenChange={setLayerOpen}><SheetContent side="right" className="layer-sheet"><SheetTitle className="sr-only">Anatomy layer manager</SheetTitle><SheetDescription className="sr-only">Presets, visibility, isolation, transparency and history.</SheetDescription><LayerManager state={s} dispatch={dispatch} onSelect={id=>{select(id);setLayerOpen(false);setMobileInfo(true);}}/></SheetContent></Sheet>
  <Sheet open={mobileBrowser} onOpenChange={setMobileBrowser}><SheetContent side="left" className="mobile-browser-sheet"><SheetTitle className="sr-only">Search anatomy</SheetTitle><SheetDescription className="sr-only">Select a system, region, or anatomical structure.</SheetDescription>{browser}</SheetContent></Sheet>
  <Sheet open={mobileInfo} onOpenChange={setMobileInfo}><SheetContent side="bottom" className="mobile-info-sheet"><SheetTitle className="sr-only">{selected?.name??'Anatomy information'}</SheetTitle><SheetDescription className="sr-only">Attachments, supply, function and clinical relationships.</SheetDescription>{panel}</SheetContent></Sheet>
  <Dialog open={about} onOpenChange={setAbout}><DialogContent className="atlas-notes"><DialogTitle>Atlas notes & coverage</DialogTitle><DialogDescription>What the current MedNote atlas represents.</DialogDescription><div className="coverage-grid"><div><strong>{entities.length}</strong><span>Knowledge records</span></div><div><strong>{assets.length}</strong><span>Eligible meshes</span></div><div><strong>32</strong><span>Bone records</span></div><div><strong>{assets.filter(a=>a.role==='attachment-patch').length}</strong><span>Eligible attachment surfaces</span></div></div><p>Anatomy knowledge and 3D geometry are reviewed separately. Missing structures remain searchable without invented replacement geometry.</p><div className="review-notice"><Info size={19}/><p>BodyParts3D and Z-Anatomy source geometry is available with documented attribution. Source mapping is not independent anatomical validation. Some structures, sensory surfaces and reviewed movement rigs remain incomplete. Two NIH clinical specimens are also available.</p></div><h3>Provenance & coverage</h3><p>BodyParts3D, © The Database Center for Life Science (CC BY 4.0; historical source CC BY-SA 2.1 Japan). Z-Anatomy — The libre 3D atlas of anatomy, Gauthier Kervyn and contributors (CC BY-SA 4.0). Converted Z-Anatomy models and annotations remain CC BY-SA 4.0.</p><a className="inline-action" href="/models/LICENSES.txt" target="_blank">Asset attribution & licenses <ArrowUpRight size={14}/></a><div className="related-chips"><a href="/data/asset-policy.json" target="_blank">Asset policy record <ArrowUpRight size={14}/></a><a href="/data/nih-clinical-provenance.json" target="_blank">Clinical specimen provenance <ArrowUpRight size={14}/></a><a href="/data/audit.json" target="_blank">Coverage audit <ArrowUpRight size={14}/></a><a href="/data/database.json" download>Download anatomy data <ArrowUpRight size={14}/></a></div><p className="console-note">Study progress is saved on this device. Each anatomy record has sources and a review state.</p></DialogContent></Dialog>
 </div></TooltipProvider>;
}
function SensoryPanel({onSelect}:{onSelect:(id:string)=>void}){const [type,setType]=useState('peripheral');return <div className="sensory-workspace"><span className="eyebrow">CUTANEOUS INNERVATION</span><h2>Two different maps</h2><Tabs value={type} onValueChange={setType}><TabsList><TabsTrigger value="peripheral">Peripheral nerves</TabsTrigger><TabsTrigger value="dermatomes">Dermatomes</TabsTrigger></TabsList></Tabs><p>{type==='peripheral'?'A peripheral nerve combines fibers from several spinal roots.':'A dermatome represents the sensory contribution of one spinal root. Borders overlap and vary.'}</p><div className="sensory-list">{(type==='peripheral'?['axillary-nerve','lateral-cutaneous-nerve-of-forearm','medial-cutaneous-nerve-of-forearm','superficial-radial-nerve','median-nerve','ulnar-nerve','intercostobrachial-nerve']:['dermatome-c5','dermatome-c6','dermatome-c7','dermatome-c8','dermatome-t1','dermatome-t2']).map(id=>{const e=byId.get(id)!;return <button key={id} onClick={()=>onSelect(id)}><strong>{e.name}</strong><span>{type==='peripheral'?nerve(e).sensory.join('; '):e.fields['Representative area']}</span><ArrowUpRight size={16}/></button>;})}</div><div className="review-notice"><Info size={17}/><p>Interactive 3D territory surfaces await validated annotations. No approximate painted territory is presented as an exact sensory boundary.</p></div></div>;}
