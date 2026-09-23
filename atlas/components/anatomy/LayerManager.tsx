'use client';
import { useState } from 'react';
import { Eye,EyeOff,Focus,Undo2,Redo2,RotateCcw,MoreHorizontal } from 'lucide-react';
import { entities,systemLabels,colors } from '@atlas/lib/anatomy';
import { presets,type ViewState,type ViewAction,type VisibilityOperation } from '@atlas/lib/state/viewer';
import { layerOf,objectVisible } from '@atlas/lib/state/visibility';
import { Switch } from '@atlas/components/ui/switch';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@atlas/components/ui/select';
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger } from '@atlas/components/ui/dropdown-menu';
import type { Entity,Muscle } from '@atlas/lib/anatomy/schema';
const labels:Record<string,string>={...systemLabels,tendon:'Tendons',lymphatic:'Lymphatics',clinical:'Clinical overlays'};
const systems=[...presets.full.systems,'clinical'];
interface Props {state:ViewState;dispatch:(a:ViewAction)=>void;onSelect:(id:string)=>void;}
function ObjectRow({entity:e,state:s,dispatch,onSelect}:Props&{entity:Entity}){
 const system=layerOf(e),ready=e.assetIds.length>0,visible=objectVisible(s,e.id,system);
 const act=(operation:VisibilityOperation)=>dispatch({type:'objects',ids:[e.id],systems:[system],operation});
 return <div className="layer-object">
  <button className="layer-eye" disabled={!ready} aria-label={`${visible?'Hide':'Show'} ${e.name}`} onClick={()=>act(visible?'hide':'show')}>{visible&&ready?<Eye size={16}/>:<EyeOff size={16}/>}</button>
  <button className="layer-name" onClick={()=>onSelect(e.id)}>{e.name}<small>{!ready?'Asset pending':s.ghostIds.includes(e.id)?'Ghost':s.transparentIds.includes(e.id)?'Transparent':visible?'Visible':'Hidden'}</small></button>
  <DropdownMenu><DropdownMenuTrigger asChild><button className="icon-button" aria-label={`Actions for ${e.name}`}><MoreHorizontal size={17}/></button></DropdownMenuTrigger>
   <DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>onSelect(e.id)}>Open study</DropdownMenuItem>
    <DropdownMenuItem disabled={!ready} onSelect={()=>dispatch({type:'focus',id:e.id})}>Focus camera</DropdownMenuItem>
    <DropdownMenuItem disabled={!ready} onSelect={()=>act('isolate')}>Isolate / restore context</DropdownMenuItem>
    <DropdownMenuItem disabled={!ready} onSelect={()=>act('ghost')}>Toggle ghost</DropdownMenuItem>
    <DropdownMenuItem disabled={!ready} onSelect={()=>act('transparent')}>Toggle transparency</DropdownMenuItem>
    <DropdownMenuItem disabled={!ready} onSelect={()=>act('restore')}>Restore structure</DropdownMenuItem>
    <DropdownMenuItem disabled={!ready} onSelect={()=>act('hide')}>Hide</DropdownMenuItem>
   </DropdownMenuContent></DropdownMenu>
 </div>;
}
export default function LayerManager(props:Props){
 const {state:s,dispatch}=props;const [filter,setFilter]=useState('');
 const current=Object.entries(presets).find(([,p])=>JSON.stringify([...p.systems].sort())===JSON.stringify([...s.visibleSystems].sort()))?.[0]??'custom';
 return <div className="dissection-manager"><div className="eyebrow">DISSECTION</div><h2>Anatomy layers</h2>
  <p className="layer-coverage">All eligible anatomy starts assembled. Current coverage is scapula, clavicle and proximal humerus; the full upper limb awaits eligible geometry.</p>
  <Select value={current} onValueChange={id=>dispatch({type:'preset',id})}><SelectTrigger aria-label="Anatomy preset"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(presets).map(([id,p])=><SelectItem value={id} key={id}>{p.name}</SelectItem>)}<SelectItem value="custom" disabled>Custom dissection</SelectItem></SelectContent></Select>
  <div className="dissection-history"><button onClick={()=>dispatch({type:'show-all'})}>Show all</button><button onClick={()=>dispatch({type:'hide-all'})}>Hide all</button><button aria-label="Undo visibility change" disabled={!s.past.length} onClick={()=>dispatch({type:'undo'})}><Undo2 size={18}/></button><button aria-label="Redo visibility change" disabled={!s.future.length} onClick={()=>dispatch({type:'redo'})}><Redo2 size={18}/></button></div>
  <input className="layer-filter" aria-label="Filter anatomy layers" placeholder="Find within layers…" value={filter} onChange={e=>setFilter(e.target.value)}/>
  <div className="layer-tree">{systems.map(system=>{
   const all=entities.filter(e=>layerOf(e)===system),list=all.filter(e=>e.name.toLowerCase().includes(filter.toLowerCase()));if(filter&&!list.length)return null;
   return <details key={system} open={filter?true:undefined}><summary><span className="system-mark" style={{background:colors[system]??'#8DD3B3'}}/><span>{labels[system]}<small>{all.filter(e=>e.assetIds.length).length} in 3D · {all.length} records</small></span><span onClick={e=>e.stopPropagation()}><Switch aria-label={`Show ${labels[system]}`} checked={s.visibleSystems.includes(system)} onCheckedChange={()=>dispatch({type:'system',system})}/></span></summary>
    {[...new Set(list.map(e=>e.region))].map(region=><details className="layer-region" key={region} open={filter?true:undefined}><summary>{region}<small>{list.filter(e=>e.region===region).length}</small></summary>
     {[...new Set(list.filter(e=>e.region===region).map(e=>system==='muscle'?(e as Muscle).compartment:'Structures'))].map(compartment=><div key={compartment}>{system==='muscle'&&<h4>{compartment}</h4>}{list.filter(e=>e.region===region&&(system!=='muscle'||(e as Muscle).compartment===compartment)).map(e=><ObjectRow key={e.id} entity={e} {...props}/>)}</div>)}
    </details>)}
   </details>;
  })}</div>
  <div className="layer-bottom"><label>Fade surrounding structures<Switch checked={s.fade} onCheckedChange={fade=>dispatch({type:'patch',patch:{fade}})}/></label><label>Selected label<Switch checked={s.labels} onCheckedChange={labels=>dispatch({type:'patch',patch:{labels}})}/></label><div className="dissection-history"><button onClick={()=>dispatch({type:'reset-anatomy'})}><RotateCcw size={16}/>Reset anatomy</button><button onClick={()=>dispatch({type:'reset'})}><Focus size={16}/>Reset camera</button></div></div>
 </div>;
}
