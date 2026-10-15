export type Mode='explore'|'attachments'|'movement'|'nerves'|'vasculature'|'clinical'|'quiz';
export const presets:Record<string,{name:string;systems:string[]}>= {
 full:{name:'Full anatomy',systems:['bone','joint','ligament','muscle','tendon','nerve','artery','vein','lymphatic']},
 musculoskeletal:{name:'Musculoskeletal',systems:['bone','muscle','tendon','joint','ligament']},skeleton:{name:'Skeleton',systems:['bone']},muscles:{name:'Muscles',systems:['muscle','tendon']},neurovascular:{name:'Neurovascular',systems:['nerve','artery','vein']},nerves:{name:'Nerves',systems:['nerve']},arteries:{name:'Arteries',systems:['artery']},veins:{name:'Veins',systems:['vein']},joints:{name:'Joints + ligaments',systems:['joint','ligament']}
};
export interface Visibility {visibleSystems:string[];hiddenIds:string[];isolateId:string|null;isolateRevealIds:string[];ghostIds:string[];transparentIds:string[];fade:boolean;opacity:number;}
export interface ViewState extends Visibility {past:Visibility[];future:Visibility[];boneStudyId:string|null;boneMode:'overview'|'landmarks'|'attachments'|'ligaments'|'joints'|'neurovascular'|'clinical';traceDirection:'up'|'down'|'both';traceId:string|null;attachmentKind:'origin'|'insertion'|'both';selectedId:string|null;region:string;labels:boolean;focusId:string|null;focusTick:number;cameraView:'anterior'|'posterior'|'lateral';mode:Mode;playing:boolean;progress:number;movementId:string;clinicalId:string;abnormal:boolean;clinicalLevel:string;quizTarget:string|null;quizConcealed:boolean;quizPoint:boolean;quizPoseId:string|null;}
const defaultVisibility:Visibility={visibleSystems:presets.full.systems,hiddenIds:[],isolateId:null,isolateRevealIds:[],ghostIds:[],transparentIds:[],fade:false,opacity:1};
export const initialView:ViewState={...defaultVisibility,past:[],future:[],boneStudyId:null,boneMode:'overview',traceDirection:'both',traceId:null,attachmentKind:'both',selectedId:null,region:'All regions',labels:true,focusId:null,focusTick:1,cameraView:'anterior',mode:'explore',playing:false,progress:0,movementId:'shoulder-abduction',clinicalId:'four-part-proximal-humerus-fracture',abnormal:false,clinicalLevel:'radial-groove',quizTarget:null,quizConcealed:false,quizPoint:false,quizPoseId:null};
export type VisibilityOperation='show'|'hide'|'isolate'|'ghost'|'transparent'|'restore';
export type ViewAction={type:'patch';patch:Partial<ViewState>}|{type:'select';id:string;system?:string}|{type:'focus';id:string|null}|{type:'system';system:string}|{type:'hide';id:string}|{type:'reset'}|{type:'undo'|'redo'|'show-all'|'hide-all'|'reset-anatomy'}|{type:'preset';id:string}|{type:'objects';ids:string[];operation:VisibilityOperation;systems?:string[]};
const keys=Object.keys(defaultVisibility) as (keyof Visibility)[];
function snapshot(s:Visibility):Visibility{return Object.fromEntries(keys.map(k=>[k,s[k]])) as unknown as Visibility;}
function commit(s:ViewState,patch:Partial<ViewState>):ViewState {const next={...s,...patch},before=snapshot(s),after=snapshot(next);return JSON.stringify(before)===JSON.stringify(after)?next:{...next,past:[...s.past.slice(-39),before],future:[]};}
const toggle=(ids:string[],id:string)=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
export function viewReducer(s:ViewState,a:ViewAction):ViewState{
 switch(a.type){
 case 'patch':return commit(s,a.patch);
 case 'select':return commit(s,{selectedId:a.id,traceId:null,focusId:a.id,focusTick:s.focusTick+1,hiddenIds:s.hiddenIds.filter(x=>x!==a.id),visibleSystems:a.system?[...new Set([...s.visibleSystems,a.system])]:s.visibleSystems,isolateRevealIds:s.isolateId&&s.isolateId!==a.id?[...new Set([...s.isolateRevealIds,a.id])]:s.isolateRevealIds});
 case 'focus':return {...s,focusId:a.id,focusTick:s.focusTick+1};
 case 'system':return commit(s,{visibleSystems:toggle(s.visibleSystems,a.system)});
 case 'hide':return commit(s,{hiddenIds:toggle(s.hiddenIds,a.id)});
 case 'reset':return {...s,cameraView:'anterior',focusId:s.quizConcealed?(s.quizPoint?null:s.quizTarget):null,focusTick:s.focusTick+1};
 case 'undo':return s.past.length?{...s,...s.past.at(-1)!,past:s.past.slice(0,-1),future:[snapshot(s),...s.future]}:s;
 case 'redo':return s.future.length?{...s,...s.future[0],past:[...s.past,snapshot(s)],future:s.future.slice(1)}:s;
 case 'show-all':case 'reset-anatomy':return commit(s,{...defaultVisibility,mode:'explore',region:'All regions',playing:false,abnormal:false,quizConcealed:false,quizPoseId:null,boneStudyId:null,boneMode:'overview',selectedId:a.type==='reset-anatomy'?null:s.selectedId});
 case 'hide-all':return commit(s,{visibleSystems:[],isolateId:null,isolateRevealIds:[],hiddenIds:[]});
 case 'preset':return presets[a.id]?commit(s,{...defaultVisibility,visibleSystems:presets[a.id].systems}):s;
 case 'objects':{const ids=new Set(a.ids),show={hiddenIds:s.hiddenIds.filter(id=>!ids.has(id)),visibleSystems:[...new Set([...s.visibleSystems,...a.systems??[]])],isolateRevealIds:s.isolateId?[...new Set([...s.isolateRevealIds,...a.ids.filter(id=>id!==s.isolateId)])]:s.isolateRevealIds};
 if(a.operation==='hide')return commit(s,{hiddenIds:[...new Set([...s.hiddenIds,...a.ids])]});
 if(a.operation==='isolate')return commit(s,{...show,isolateId:s.isolateId===a.ids[0]?null:a.ids[0],isolateRevealIds:a.ids.slice(1)});
 if(a.operation==='ghost'||a.operation==='transparent'){const key=a.operation==='ghost'?'ghostIds':'transparentIds';return commit(s,{...show,[key]:a.ids.reduce(toggle,s[key])});}
 if(a.operation==='restore')return commit(s,{...show,ghostIds:s.ghostIds.filter(id=>!ids.has(id)),transparentIds:s.transparentIds.filter(id=>!ids.has(id))});return commit(s,show);}
 }
}
