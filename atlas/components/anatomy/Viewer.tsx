'use client';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { ViewState } from '@atlas/lib/state/viewer';
import type { AnatomyScene } from '@atlas/lib/scene/AnatomyScene';
import { nameOf, byId, landmarkAnnotations } from '@atlas/lib/anatomy';
import { RotateCcw, AlertCircle, LoaderCircle } from 'lucide-react';
export interface ViewerHandle {focus:(id:string|null)=>void;zoom:(factor:number)=>void;}
interface Props{state:ViewState;onSelect:(id:string)=>void;onProgress:(n:number)=>void;}
const Viewer=forwardRef<ViewerHandle,Props>(function Viewer({state,onSelect,onProgress},ref){
 const host=useRef<HTMLDivElement>(null),engine=useRef<AnatomyScene|null>(null),stateRef=useRef(state),selectRef=useRef(onSelect),progressRef=useRef(onProgress);
 stateRef.current=state;selectRef.current=onSelect;progressRef.current=onProgress;
 const [load,setLoad]=useState({loaded:0,total:1,errors:[] as string[]}),[error,setError]=useState(''),[label,setLabel]=useState<{x:number;y:number}|null>(null),[generation,setGeneration]=useState(0);
 useImperativeHandle(ref,()=>({focus:id=>engine.current?.focus(id),zoom:factor=>engine.current?.zoom(factor)}),[]);
 useEffect(()=>{let canceled=false;import('@atlas/lib/scene/AnatomyScene').then(({AnatomyScene})=>{if(canceled||!host.current)return;try{const scene=new AnatomyScene(host.current,{onSelect:id=>selectRef.current(id),onProgress:(loaded,total,errors)=>setLoad({loaded,total,errors}),onFrame:(p,n)=>{setLabel(p);progressRef.current(n);},onError:setError});engine.current=scene;scene.update(stateRef.current);}catch(e){setError(e instanceof Error&&/WebGL context/.test(e.message)?'3D graphics are unavailable in this browser. Enable WebGL or open MedNote in a browser with graphics support. Anatomy records and relationship maps remain available.':e instanceof Error?e.message:'Unable to initialize 3D graphics.');}}).catch(()=>setError('Unable to load the 3D viewer.'));
 return()=>{canceled=true;engine.current?.dispose();engine.current=null;};},[generation]);
 useEffect(()=>{engine.current?.update(state);},[state]);
 const direct=state.selectedId&&(byId.get(state.selectedId)?.assetIds.length||landmarkAnnotations.has(state.selectedId));
 return <div className="viewer-content"><div className="canvas-host" ref={host}/>
  {!load.loaded&&!error&&!load.errors.length&&<div className="viewer-loading" role="status"><LoaderCircle size={25} className="spin"/><strong>Opening the anatomy atlas</strong><span>Loading source anatomy…</span></div>}
  {load.loaded>0&&load.loaded<load.total&&<div className="stream-status" role="status">Loading layers · {load.loaded}/{load.total}</div>}
  {error&&<div className="viewer-error" role="alert"><AlertCircle/><strong>3D viewer interrupted</strong><p>{error}</p><button className="primary-button" onClick={()=>{setError('');setLoad({loaded:0,total:1,errors:[]});setGeneration(g=>g+1);}}><RotateCcw size={16}/>Reload viewer</button></div>}
  {load.errors.length>0&&<div className="stream-status">Some source layers could not load. Other anatomy remains available. <button onClick={()=>{setLoad({loaded:0,total:1,errors:[]});setGeneration(g=>g+1);}}>Retry</button></div>}
  {label&&direct&&state.labels&&!state.quizConcealed&&<div className="model-label" style={{left:`${label.x}%`,top:`${label.y}%`}}><span/>{nameOf(state.selectedId!)}</div>}
 </div>;
});export default Viewer;
