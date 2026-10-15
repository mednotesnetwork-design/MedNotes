import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assets, byId, byAsset, relatedAssetIds, attachmentAssets, landmarkAnnotations } from '@atlas/lib/anatomy';
import { bonePatches,landmarkFamily,tracedIds } from '@atlas/lib/anatomy/study';
import { initialView, type ViewState } from '@atlas/lib/state/viewer';
import { objectVisible,objectOpacity } from '@atlas/lib/state/visibility';
import { motionIds, poseIds, poseMatrices } from './kinematics';
export interface SceneHooks {onSelect:(id:string)=>void;onProgress:(loaded:number,total:number,errors:string[])=>void;onFrame:(position:{x:number;y:number}|null,progress:number)=>void;onError:(message:string)=>void;}
const baseColor:Record<string,string>={bone:'#e1d4ba',muscle:'#9e5550',artery:'#ba5249',vein:'#527f9a',ligament:'#cfc9b6',nerve:'#d9ba62'};
export class AnatomyScene{
 renderer:THREE.WebGLRenderer; scene=new THREE.Scene(); camera:THREE.PerspectiveCamera; controls:OrbitControls;
 private container:HTMLElement;private hooks:SceneHooks;private state:ViewState={...initialView};private meshes=new Map<string,THREE.Mesh>();private originals=new Map<string,THREE.Matrix4>();private urls=new Set<string>();private pending=new Map<string,Promise<void>>();private failures:string[]=[];
 private marker=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),new THREE.MeshBasicMaterial({color:'#8DD3B3',depthTest:false}));private disposed=false;private dirty=true;private raf=0;private observer:ResizeObserver;private down={x:0,y:0,time:0};private pointers=new Set<number>();private multiTouch=false;private lastTap={id:'',time:0};private transition:{from:THREE.Vector3;to:THREE.Vector3;target:THREE.Vector3;started:number}|null=null;private start=0;private lastEmit=0;private lastFocus=-1;private selectedAssets=new Set<string>();private queue: string[]=[];private active=0;
 constructor(container:HTMLElement,hooks:SceneHooks){
  this.container=container;this.hooks=hooks;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));this.renderer.setClearColor('#0D1F20',0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
  const canvas=this.renderer.domElement;canvas.setAttribute('aria-label','Interactive three-dimensional right upper limb. Drag to rotate, pinch to zoom, tap a structure to select.');canvas.setAttribute('role','img');canvas.style.touchAction='none';container.appendChild(canvas);
  this.camera=new THREE.PerspectiveCamera(33,1,.01,100);this.camera.position.set(0,0,9);
  this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,0,0);this.controls.enableDamping=true;this.controls.dampingFactor=.12;this.controls.minDistance=.3;this.controls.maxDistance=25;this.controls.enablePan=true;this.controls.rotateSpeed=.7;this.controls.zoomSpeed=.8;this.controls.touches.ONE=THREE.TOUCH.ROTATE;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  this.controls.addEventListener('change',this.invalidate);this.controls.addEventListener('start',this.stopTransition);
  this.marker.visible=false;this.marker.renderOrder=9;this.marker.userData.annotation=true;this.scene.add(this.marker);
  this.scene.add(new THREE.HemisphereLight('#e7f1ee','#20363a',1.5));
  for(const [pos,power,color] of [[[-4,6,7],2.8,'#fff5e9'],[[5,0,4],1.2,'#d5e9e7'],[[-3,3,-5],2.5,'#dae5e4']] as const){const l=new THREE.DirectionalLight(color,power);l.position.set(pos[0],pos[1],pos[2]);this.scene.add(l);}
  this.observer=new ResizeObserver(this.resize);this.observer.observe(container);this.resize();
  canvas.addEventListener('pointerdown',this.pointerDown);canvas.addEventListener('pointerup',this.pointerUp);canvas.addEventListener('pointercancel',this.pointerCancel);canvas.addEventListener('dblclick',this.doubleClick);canvas.addEventListener('webglcontextlost',this.contextLost);
  this.tick();
 }
 private invalidate=()=>{this.dirty=true;};private stopTransition=()=>{this.transition=null;};
 private resize=()=>{const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;};
 private pointerDown=(e:PointerEvent)=>{this.pointers.add(e.pointerId);if(this.pointers.size===1)this.multiTouch=false;else this.multiTouch=true;this.down={x:e.clientX,y:e.clientY,time:performance.now()};};
 private pointerUp=(e:PointerEvent)=>{this.pointers.delete(e.pointerId);if(this.multiTouch)return;if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>7||performance.now()-this.down.time>700)return;const id=this.pick(e);if(id){this.hooks.onSelect(id);const time=performance.now();if(e.pointerType==='touch'&&this.lastTap.id===id&&time-this.lastTap.time<350)this.focus(id);this.lastTap={id,time};}};
 private pointerCancel=(e:PointerEvent)=>{this.pointers.delete(e.pointerId);this.multiTouch=true;};
 private doubleClick=(e:MouseEvent)=>{const id=this.pick(e);if(id)this.focus(id);};
 private contextLost=(e:Event)=>{e.preventDefault();this.hooks.onError('The 3D graphics context was interrupted. Reload the viewer to restore it.');};
 private pick(e:{clientX:number;clientY:number}){const r=this.renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const choices=[...this.meshes.values()].filter(m=>m.visible&&(m.material as THREE.MeshStandardMaterial).opacity>0.01);if(this.marker.visible&&ray.intersectObject(this.marker,false).length)return this.marker.userData.entityId as string;const hits=ray.intersectObjects(choices,false);return (hits.find(h=>((h.object as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity>.5)??hits[0])?.object.userData.entityId as string|undefined;}
 update(state:ViewState){const wasPlaying=this.state.playing;const previous=this.state;this.state=state;
  if(state.playing&&!wasPlaying)this.start=performance.now()-Math.acos(1-2*Math.max(0,Math.min(1,state.progress)))/(Math.PI*2)*6000;
  this.selectedAssets=new Set(state.quizConcealed?(state.quizPoint?[]:state.quizTarget?relatedAssetIds(state.quizTarget):[]):state.selectedId?byId.get(state.selectedId)?.assetIds??[]:[]);
  const relevant=[...state.visibleSystems];const contextual=relatedAssetIds(state.selectedId??'');
  const patches=state.boneStudyId&&state.boneMode==='attachments'?bonePatches(state.boneStudyId,state.attachmentKind):state.mode==='attachments'?attachmentAssets(state.selectedId??'',state.attachmentKind):[];
  const regions=state.boneStudyId&&state.boneMode==='landmarks'?assets.filter(a=>a.role==='landmark-area'&&a.review==='validated'&&a.boneId===state.boneStudyId):[];
  const annotation=landmarkAnnotations.get(state.selectedId??'');
  const support=assets.filter(a=>a.role==='attachment-support'&&(patches.some(p=>p.boneId===a.entityId)||annotation?.boneId===a.entityId));
  const trace=state.traceId?tracedIds(state.traceId,state.traceDirection).flatMap(id=>byId.get(id)?.assetIds??[]):[];trace.forEach(id=>this.selectedAssets.add(id));
  const needed=assets.filter(a=>(a.role===undefined||a.role==='anatomy')&&(relevant.includes(a.system)||contextual.includes(a.id)||this.selectedAssets.has(a.id)||(state.quizConcealed&&state.quizTarget?relatedAssetIds(state.quizTarget).includes(a.id):false)));
  needed.push(...patches,...support,...regions,...assets.filter(a=>a.role==='clinical-specimen'&&a.entityId===state.clinicalId&&state.mode==='clinical'));
  if(state.mode==='movement'||state.mode==='clinical'||state.mode==='quiz')assets.filter(a=>a.system==='bone'&&a.role!=='attachment-support').forEach(a=>needed.push(a));
  const urls=[...new Set(needed.map(a=>a.url))];for(const url of urls)if(!this.urls.has(url)&&!this.pending.has(url)&&!this.queue.includes(url)&&!this.failures.includes(url))this.queue.push(url);this.drain();
  this.updateAppearance();
  if(state.cameraView!==previous.cameraView)this.orient(state.cameraView);
  if(state.abnormal!==previous.abnormal&&state.mode==='clinical')this.focus(state.abnormal?state.clinicalId:null);
  if(state.focusTick!==this.lastFocus){this.lastFocus=state.focusTick;if(this.meshes.size)this.focus(state.focusId);}
  this.dirty=true;
 }
 private drain(){while(this.active<3&&this.queue.length&&!this.disposed){const url=this.queue.shift()!;this.active++;const p=this.load(url).finally(()=>{this.active--;this.pending.delete(url);this.drain();});this.pending.set(url,p);}}
 private async load(url:string){try{
   const g=await new GLTFLoader().loadAsync(url);if(this.disposed){g.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});return;}
   g.scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const id=o.name,meta=byAsset.get(id);if(!meta)return;
    o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
    const old=o.material;const material=new THREE.MeshStandardMaterial({color:baseColor[meta.system]??baseColor.bone,roughness:meta.system==='muscle'?.79:.6,metalness:0,side:THREE.DoubleSide});o.material=material; if(!Array.isArray(old))old.dispose();
    o.userData={...o.userData,entityId:meta.entityId,system:meta.system,region:meta.region,meshId:id};o.matrixAutoUpdate=false;o.updateMatrix();this.originals.set(id,o.matrix.clone());this.meshes.set(id,o);
   });this.scene.add(g.scene);this.urls.add(url);this.updateAppearance();
   if(this.state.mode==='clinical'&&!this.state.abnormal)this.focus(null);else if(this.state.focusId&&relatedAssetIds(this.state.focusId).length)this.focus(this.state.focusId);else this.focus(null);
   this.hooks.onProgress(this.urls.size,this.urls.size+this.active+this.queue.length-1,this.failures);this.dirty=true;
  }catch{if(this.disposed)return;this.failures.push(url);this.hooks.onProgress(this.urls.size,this.urls.size+this.failures.length,this.failures);}
 }
 private updateAppearance(){
  const s=this.state;const motionMode=s.mode==='movement'&&motionIds.has(s.movementId)&&(s.playing||s.progress>0);
  const clinicalMode=(s.mode==='clinical'&&poseIds.has(s.clinicalId))||(s.mode==='quiz'&&!!s.quizPoseId);
  const iso=new Set(s.isolateId?[s.isolateId,...s.isolateRevealIds].flatMap(id=>byId.get(id)?.assetIds??[]):[]);
  const hidden=new Set(s.hiddenIds.flatMap(id=>byId.get(id)?.assetIds??[]));
  const selected=this.selectedAssets;
  const patches=s.boneStudyId&&s.boneMode==='attachments'?bonePatches(s.boneStudyId,s.attachmentKind):s.mode==='attachments'?attachmentAssets(s.selectedId??'',s.attachmentKind):[];const patchIds=new Set(patches.map(p=>p.id));const supportBones=new Set(patches.map(p=>p.boneId));const annotation=landmarkAnnotations.get(s.selectedId??'');if(annotation&&!s.quizConcealed&&assets.some(a=>a.role==='attachment-support'&&a.entityId===annotation.boneId))supportBones.add(annotation.boneId);this.marker.visible=!!annotation&&!s.quizConcealed&&!s.hiddenIds.includes(s.selectedId??'');if(annotation){this.marker.position.fromArray(annotation.position);this.marker.userData.entityId=annotation.entityId;}
  const specimen=assets.find(a=>a.role==='clinical-specimen'&&a.entityId===s.clinicalId&&s.mode==='clinical');
  const target=byId.get(s.mode==='movement'?s.movementId:s.mode==='clinical'?s.clinicalId:'');
  const related=new Set(target?relatedAssetIds(target.id):[]);
  for(const [id,m] of this.meshes){
   const meta=byAsset.get(id)!;const mat=m.material as THREE.MeshStandardMaterial;
   let visible=objectVisible(s,meta.entityId,meta.system);

   if(iso.size)visible=visible&&iso.has(id);
   if(meta.role==='attachment-support')visible=supportBones.has(meta.entityId);
   if(meta.system==='bone'&&meta.role!=='attachment-support'&&supportBones.has(meta.entityId))visible=false;
   if(meta.role==='attachment-patch')visible=patchIds.has(id);
   if(meta.role==='landmark-area')visible=meta.review==='validated'&&s.boneMode==='landmarks'&&meta.boneId===s.boneStudyId;
   if(specimen)visible=s.abnormal?id===specimen.id&&s.visibleSystems.includes('clinical'):meta.role!=='clinical-specimen'&&objectVisible(s,meta.entityId,meta.system);
   else if(meta.role==='clinical-specimen')visible=false;
   if(hidden.has(id))visible=false;
   if(motionMode||clinicalMode)visible=meta.system==='bone'&&meta.role!=='attachment-support'&&!['ribs','sternum'].includes(meta.entityId);
   if(s.mode==='quiz'&&!s.quizPoseId)visible=(meta.role===undefined||meta.role==='anatomy')&&(meta.system==='bone'||(s.quizPoint?meta.system===byId.get(s.quizTarget??'')?.system:(s.quizTarget?relatedAssetIds(s.quizTarget).includes(id):false)));
   if(s.mode!=='quiz'&&s.hiddenIds.includes(meta.entityId))visible=false;
   m.visible=visible;
   const isSelected=selected.has(id),isRelated=related.has(id)&&!motionMode&&!clinicalMode;
   const selectedColor:Record<string,string>={bone:'#f3dfb8',muscle:'#d4a596',nerve:'#f3d481',artery:'#e47c6c',vein:'#8cbdd6',ligament:'#ece4c7'};mat.color.set(isSelected||isRelated?selectedColor[meta.system]??'#d4a596':baseColor[meta.system]??baseColor.bone);
   let alpha=s.opacity;
   if(meta.system==='bone')alpha=1;
   if(s.fade&&selected.size&&!isSelected&&!iso.size&&!motionMode&&!clinicalMode&&!s.quizConcealed)alpha=meta.system==='bone'?.55:.12;
   if(s.quizConcealed&&!s.quizPoseId)alpha=s.quizPoint?1:isSelected?1:.18;
   if(meta.role==='landmark-area'){mat.color.set(landmarkFamily(meta.name).color);alpha=1;}
   if(patchIds.has(id)){mat.color.set(meta.attachmentKind==='origin'?'#8DD3B3':'#D7AEB3');alpha=1;}
   if(meta.role==='attachment-support')alpha=.85;
   if(specimen)alpha=1;
   if(s.mode!=='quiz')alpha=Math.min(alpha,objectOpacity(s,meta.entityId));
   mat.polygonOffset=meta.role==='attachment-patch';mat.polygonOffsetFactor=-2;mat.polygonOffsetUnits=-2;
   mat.opacity=alpha;mat.transparent=alpha<.98;mat.depthWrite=alpha>.85;m.renderOrder=patchIds.has(id)?5:isSelected?3:mat.transparent?1:0;
   m.matrix.copy(this.originals.get(id)!);mat.needsUpdate=true;
  }
 }
 focus(id:string|null){let box=new THREE.Box3();
  const ids=id?new Set(relatedAssetIds(id)):null;
  for(const [aid,m] of this.meshes)if(ids?ids.has(aid):m.visible)box.expandByObject(m);
  const annotation=id?landmarkAnnotations.get(id):null;if(annotation){const p=new THREE.Vector3().fromArray(annotation.position);box=new THREE.Box3().setFromCenterAndSize(p,new THREE.Vector3(1.1,1.1,1.1));}
  if(box.isEmpty())return;
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const limiting=Math.max(size.y,size.x/this.camera.aspect,.45);const distance=Math.max(.7,limiting/(2*Math.tan(this.camera.fov*Math.PI/360))*1.35);
  let direction=this.camera.position.clone().sub(this.controls.target).normalize();if(!Number.isFinite(direction.x))direction=new THREE.Vector3(0,0,1);
  this.transition={from:this.camera.position.clone(),to:center.clone().add(direction.multiplyScalar(distance)),target:center,started:performance.now()};this.dirty=true;
 }
 orient(view:string){const dist=this.camera.position.distanceTo(this.controls.target);const direction=view==='posterior'?new THREE.Vector3(0,0,-1):view==='lateral'?new THREE.Vector3(-1,0,0):new THREE.Vector3(0,0,1);this.transition={from:this.camera.position.clone(),to:this.controls.target.clone().add(direction.multiplyScalar(dist)),target:this.controls.target.clone(),started:performance.now()};this.dirty=true;}
 zoom(factor:number){const v=this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);this.camera.position.copy(this.controls.target).add(v);this.dirty=true;}
 private tick=()=>{if(this.disposed)return;this.raf=requestAnimationFrame(this.tick);const now=performance.now();this.controls.update();
  if(this.transition){const p=Math.min(1,(now-this.transition.started)/450),ease=1-Math.pow(1-p,3);this.camera.position.lerpVectors(this.transition.from,this.transition.to,ease);this.controls.target.lerp(this.transition.target,.2);if(p===1){this.controls.target.copy(this.transition.target);this.transition=null;}this.dirty=true;}
  const s=this.state;let progress=s.progress;
  if(s.playing){progress=(1-Math.cos(((now-this.start)%6000)/6000*Math.PI*2))/2;this.dirty=true;}
  const pose=s.mode==='clinical'&&poseIds.has(s.clinicalId)?s.clinicalId:s.mode==='quiz'?s.quizPoseId:null;
  if((s.mode==='movement'&&motionIds.has(s.movementId))||pose){
   const mats=poseMatrices(s.movementId,pose?(s.quizPoseId?1:s.abnormal?(s.clinicalId==='hand-of-benediction'?progress:1):0):progress,pose,s.clinicalLevel);
   for(const [aid,m] of this.meshes){const transform=mats.get(m.userData.entityId);m.matrix.copy(this.originals.get(aid)!);if(transform)m.matrix.premultiply(transform);m.matrixWorldNeedsUpdate=true;}
  }
  if(this.marker.visible)this.marker.scale.setScalar(this.camera.position.distanceTo(this.marker.position)*.006);
  if(this.dirty){this.renderer.render(this.scene,this.camera);this.dirty=false;}
  if(now-this.lastEmit>150){
   let position=null;if(s.labels&&!s.quizConcealed&&s.selectedId){const directIds=new Set(byId.get(s.selectedId)?.assetIds??[]);const chosen=[...this.meshes].filter(([id,m])=>directIds.has(id)&&m.visible);if(chosen.length){const b=new THREE.Box3();chosen.forEach(([,m])=>b.expandByObject(m));const p=b.getCenter(new THREE.Vector3()).project(this.camera);if(p.z<1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.95)position={x:(p.x+1)/2*100,y:(1-p.y)/2*100};}}
   const annotation=landmarkAnnotations.get(s.selectedId??'');if(annotation&&this.marker.visible&&s.labels){const p=this.marker.position.clone().project(this.camera);if(p.z<1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.95)position={x:(p.x+1)/2*100,y:(1-p.y)/2*100};}
   this.hooks.onFrame(position,progress);this.lastEmit=now;
  }
 };
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.controls.removeEventListener('change',this.invalidate);this.controls.removeEventListener('start',this.stopTransition);this.controls.dispose();const c=this.renderer.domElement;c.removeEventListener('pointerdown',this.pointerDown);c.removeEventListener('pointerup',this.pointerUp);c.removeEventListener('pointercancel',this.pointerCancel);c.removeEventListener('dblclick',this.doubleClick);c.removeEventListener('webglcontextlost',this.contextLost);for(const m of this.meshes.values()){m.geometry.dispose();(m.material as THREE.Material).dispose();}this.marker.geometry.dispose();this.marker.material.dispose();this.renderer.dispose();c.remove();}
}
