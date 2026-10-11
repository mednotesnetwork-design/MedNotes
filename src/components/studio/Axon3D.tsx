import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {Maximize2,RotateCcw,ZoomIn,ZoomOut} from 'lucide-react';

type Mode='anterograde'|'retrograde';
export function Axon3D({mode}:{mode:Mode}){
 const mount=useRef<HTMLDivElement>(null),model=useRef<THREE.Group|null>(null),cameraRef=useRef<THREE.PerspectiveCamera|null>(null);
 const cargo=useRef<THREE.Group|null>(null),modeRef=useRef(mode),running=useRef(true);
 const [error,setError]=useState(false),[playing,setPlaying]=useState(true);
 modeRef.current=mode;running.current=playing;
 useEffect(()=>{
  const root=mount.current;
  if(!root)return;
  let frame=0,renderer:THREE.WebGLRenderer|null=null;
  let observer:ResizeObserver|null=null;
  try {
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure=1.25;
   root.appendChild(renderer.domElement);
   const scene=new THREE.Scene();
   scene.background=new THREE.Color('#0d2227');
   scene.fog=new THREE.FogExp2('#0d2227',.012);
   const camera=new THREE.PerspectiveCamera(34,1,.1,120);
   camera.position.set(0,5,21);
   camera.lookAt(0,0,0);cameraRef.current=camera;
   scene.add(new THREE.HemisphereLight(0xc7eaf4,0x35252f,2.6));
   const key=new THREE.DirectionalLight(0xffe3be,4.0);key.position.set(2,9,12);scene.add(key);
   const fill=new THREE.DirectionalLight(0x8dd3b3,2.8);fill.position.set(-8,-5,-7);scene.add(fill);
   const rim=new THREE.PointLight(0x66e5c7,95,21);rim.position.set(3,5,-2);scene.add(rim);
   const group=new THREE.Group();scene.add(group);model.current=group;
   const mat=(color:number,roughness=.4,metalness=.05,opacity=1)=>new THREE.MeshPhysicalMaterial({
     color,roughness,metalness,transparent:opacity<1,opacity,
     clearcoat:.45,clearcoatRoughness:.26,side:THREE.DoubleSide,depthWrite:opacity>=1
   });
   const membrane=mat(0x4f9b91,.26,.04,.18);
   const nerveWall=mat(0x39716f,.44,.05,.22);
   const somaMat=mat(0x4e9488,.56,.07,.95);
   const nucleusMat=mat(0x316175,.27,.08,.98);
   const trackMat=mat(0x8bc9bd,.33,.2);
   const filamentMat=mat(0x4e7e7c,.3,.3);
   const cargoMat=mat(0xe9cfa0,.19,.25);
   const cargoCore=mat(0x8c5f43,.34,.07,.75);
   const motorMat=mat(0xd9b582,.28,.18);
   const tipMat=mat(0x77bba1,.45,.1);
   function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Group|THREE.Scene=group){
     const m=new THREE.Mesh(geometry,material);parent.add(m);return m;
   }
   function tube(points:THREE.Vector3[],radius:number,material:THREE.Material,segments=90){
     return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),segments,radius,10,false),material);
   }
   // This is a symbolic 3D orientation model, not a scan or histologic reconstruction.
   const body=mesh(new THREE.SphereGeometry(1.34,48,32),somaMat);
   body.position.set(-6.7,0,0);body.scale.set(1.35,1,.86);
   const halo=mesh(new THREE.SphereGeometry(1.40,48,32),membrane);
   halo.position.copy(body.position);halo.scale.copy(body.scale);
   const nucleus=mesh(new THREE.SphereGeometry(.56,32,24),nucleusMat);
   nucleus.position.set(-7.1,.12,.59);nucleus.scale.set(1,.84,.57);
   const nucleolus=mesh(new THREE.SphereGeometry(.18,24,16),mat(0xbddbd0,.3,.03));
   nucleolus.position.set(-7.2,.16,.87);
   const sheath=mesh(new THREE.CylinderGeometry(.68,.68,12,54,8,true),nerveWall);
   sheath.rotation.z=Math.PI/2;sheath.position.set(.1,0,0);
   const surface=mesh(new THREE.CylinderGeometry(.74,.74,12.4,54,8,true),membrane);
   surface.rotation.z=Math.PI/2;surface.position.set(.1,0,0);
   for(const y of [-.29,.29]){
     const rail=tube([new THREE.Vector3(-5.3,y,0),new THREE.Vector3(-2.5,y,.045),new THREE.Vector3(.7,y,.045),new THREE.Vector3(3.4,y,.045),new THREE.Vector3(5.8,y,0)],.085,trackMat,96);
     rail.material=trackMat;
     for(let j=0;j<30;j++){
      const x=-5.25+j*.37;
      const sph=mesh(new THREE.SphereGeometry(.095,12,10),filamentMat);
      sph.position.set(x,y,.058);
     }
   }
   for(let i=0;i<5;i++){
    const angle=(i/4)*Math.PI*.85-Math.PI*.43;
    const end=new THREE.Vector3(8.1,Math.sin(angle)*2.3,Math.cos(angle)*1.9);
    const mids=[new THREE.Vector3(5.9,0,0),new THREE.Vector3(6.6,.15+end.y*.2,.1+end.z*.2),new THREE.Vector3(7.25,end.y*.65,end.z*.65),end];
    tube(mids,i===2?.20:.16,tipMat,42);
    const bouton=mesh(new THREE.SphereGeometry(.34,28,20),tipMat);
    bouton.position.copy(end);bouton.scale.set(1.15,.85,.9);
   }
   for(let j=0;j<3;j++){
    const q=mesh(new THREE.SphereGeometry(.23,20,16),cargoMat);
    q.position.set(-3+j*3.1,.15,.55);q.scale.set(1.08,.91,1);
   }
   const carrier=new THREE.Group();group.add(carrier);cargo.current=carrier;
   const vesicle=mesh(new THREE.SphereGeometry(.34,28,22),cargoMat,carrier);
   vesicle.position.set(0,0,.12);
   mesh(new THREE.SphereGeometry(.2,20,16),cargoCore,carrier).position.set(0,0,.36);
   for(let i=0;i<4;i++){
    const leg=tube([new THREE.Vector3(-.1+i*.06,-.1,.02),new THREE.Vector3(-.08+i*.08,-.29,-.02),new THREE.Vector3(-.06+i*.09,-.39,-.02)],.028,motorMat,12);
    group.remove(leg);carrier.add(leg);
   }
   for(let j=0;j<5;j++){
    const ves=mesh(new THREE.SphereGeometry(.13,14,10),cargoMat);
    ves.position.set(-5+j*2.15,-.46,j%2?.25:-.25);
   }
   let rotationX=.07,rotationY=-.22,zoom=1;
   const down={active:false,x:0,y:0};
   const pointerDown=(e:PointerEvent)=>{down.active=true;down.x=e.clientX;down.y=e.clientY;root.setPointerCapture?.(e.pointerId);};
   const pointerMove=(e:PointerEvent)=>{
    if(!down.active)return;
    rotationY+=Math.max(-.2,Math.min(.2,(e.clientX-down.x)*.006));
    rotationX=Math.min(.65,Math.max(-.58,rotationX+(e.clientY-down.y)*.003));
    down.x=e.clientX;down.y=e.clientY;
   };
   const pointerUp=()=>{down.active=false;};
   const scroll=(e:WheelEvent)=>{e.preventDefault();zoom=Math.min(1.5,Math.max(.75,zoom+e.deltaY*.001));camera.position.z=21*zoom;};
   root.addEventListener('pointerdown',pointerDown);
   root.addEventListener('pointermove',pointerMove);
   root.addEventListener('pointerup',pointerUp);
   root.addEventListener('pointercancel',pointerUp);
   root.addEventListener('wheel',scroll,{passive:false});
   // Buttons control camera through a custom event, no global web storage.
   const action=(e:Event)=>{
    const kind=(e as CustomEvent<string>).detail;
    if(kind==='reset'){rotationX=.07;rotationY=-.22;zoom=1;}
    if(kind==='in')zoom=Math.max(.72,zoom-.13);
    if(kind==='out')zoom=Math.min(1.65,zoom+.13);
    camera.position.z=21*zoom;
   };
   root.addEventListener('axon-camera',action);
   function resize(){
    if(!renderer)return;const w=Math.max(220,root!.clientWidth),h=Math.max(220,root!.clientHeight);
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
   }
   if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(root);}
   else window.addEventListener('resize',resize);
   resize();
   const clock=new THREE.Clock();let elapsed=0;
   const paint=()=>{
    frame=requestAnimationFrame(paint);
    const dt=Math.min(clock.getDelta(),.05);
    if(running.current)elapsed+=dt;
    group.rotation.y+=(rotationY-group.rotation.y)*.11;
    group.rotation.x+=(rotationX-group.rotation.x)*.11;
    const forward=modeRef.current==='anterograde';
    const cycle=(elapsed*.24)%1;
    carrier.position.set((forward?-5.15+cycle*10.6:5.45-cycle*10.6),.28,Math.cos(elapsed*2)*.06+.38);
    carrier.rotation.y=forward?0:Math.PI;
    if(running.current)carrier.rotation.z=Math.sin(elapsed*9)*.07;
    renderer!.render(scene,camera);
   };
   paint();
   return()=>{
    cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);
    root.removeEventListener('pointerdown',pointerDown);root.removeEventListener('pointermove',pointerMove);
    root.removeEventListener('pointerup',pointerUp);root.removeEventListener('pointercancel',pointerUp);
    root.removeEventListener('wheel',scroll);root.removeEventListener('axon-camera',action);
    scene.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.geometry.dispose();});
    const materials=new Set<THREE.Material>();scene.traverse(obj=>{if(obj instanceof THREE.Mesh){
      const p=obj.material;if(Array.isArray(p))p.forEach(m=>materials.add(m));else materials.add(p);
    }});materials.forEach(m=>m.dispose());
    renderer?.dispose();renderer?.domElement.remove();
    cameraRef.current=null;model.current=null;cargo.current=null;
   };
  }catch(e){
   console.warn('Axon 3D unavailable: falling back to two-dimensional scientific model');
   renderer?.dispose();renderer?.domElement.remove();
   setError(true);
  }
 },[]);
 const action=(what:string)=>mount.current?.dispatchEvent(new CustomEvent('axon-camera',{detail:what}));
 return <div className="mn8-axon3d" dir="rtl">
  <div className="mn8-viewport" ref={mount} role="img" aria-label="مجسم ثلاثي الأبعاد تعليمي للنقل المحوري. اسحبي لتدوير المجسم واستخدمي أزرار التكبير">
   {error&&<p className="mn8-nogl">العرض ثلاثي الأبعاد غير مدعوم على الجهاز. استخدمي العرض ثنائي الأبعاد البديل.</p>}
   {!error&&<><span className="mn8-model-stamp">ANATOMICAL ORIENTATION · 3D</span><div className="mn8-model-labels"><span>SOMA · جسم الخلية</span><span>MICROTUBULES · الأنابيب الدقيقة</span><span>TERMINALS · النهايات العصبية</span></div></>}
  </div>
  <div className="mn8-actions">
   <span>{mode==='anterograde'?'Kinesin · حركة من جسم الخلية للنهايات':'Dynein · حركة نحو جسم الخلية'}</span>
   <div><button onClick={()=>{setPlaying(v=>!v)}} type="button">{playing?'إيقاف':'تشغيل'}</button><button type="button" aria-label="تكبير" onClick={()=>action('in')}><ZoomIn size={17}/></button><button type="button" aria-label="تصغير" onClick={()=>action('out')}><ZoomOut size={17}/></button><button type="button" aria-label="إعادة زاوية الرؤية" onClick={()=>action('reset')}><RotateCcw size={16}/></button></div>
  </div>
  <p className="mn8-axon-caption">مجسم تعليمي قابل للتدوير يوضّح اتجاه النقل ومسار الشحنة داخل المحور. الأبعاد والألوان توضيحية وليست تصويرًا خلويًا حقيقيًا.</p>
 </div>;
}
