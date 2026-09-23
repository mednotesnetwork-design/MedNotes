'use client';
import { byId, nameOf, nerve } from '@atlas/lib/anatomy';
import { useMemo } from 'react';
import TraceControls,{type TraceDirection} from './TraceControls';
import { tracedIds } from '@atlas/lib/anatomy/study';
const columns=[['root-c5','root-c6','root-c7','root-c8','root-t1'],['upper-trunk','middle-trunk','lower-trunk'],['upper-anterior-division','upper-posterior-division','middle-anterior-division','middle-posterior-division','lower-anterior-division','lower-posterior-division'],['lateral-cord','posterior-cord','medial-cord'],['musculocutaneous-nerve','axillary-nerve','radial-nerve','median-nerve','ulnar-nerve']];
const headings=['ROOTS','TRUNKS','DIVISIONS','CORDS','TERMINAL NERVES'];
const coords=new Map(columns.flatMap((ids,col)=>ids.map((id,i)=>[id,{x:28+col*155,y:74+i*(410/(ids.length-1||1)),col}] as const)));
const short=(id:string)=>id.startsWith('root-')?id.slice(5).toUpperCase():id.includes('division')?(id.includes('anterior')?'Anterior':'Posterior'):nameOf(id).replace(' nerve','').replace(' cord','').replace(' trunk','');
export default function PlexusGraph({selectedId,onSelect,direction,onDirection}:{selectedId:string|null;onSelect:(id:string)=>void;direction:TraceDirection;onDirection:(v:TraceDirection)=>void}){
 const traced=useMemo(()=>new Set(selectedId?tracedIds(selectedId,direction):[]),[selectedId,direction]);
 const edges=columns.flat().flatMap(id=>nerve(byId.get(id)!).parentIds.filter(p=>coords.has(p)).map(p=>[p,id]));
 const select=selectedId?byId.get(selectedId):null;
 const collateral=select&&select.system==='nerve'?nerve(select).branchIds.filter(id=>!coords.has(id)):[];
 return <div className="graph-workspace"><div className="graph-title"><span className="eyebrow">FIBER CONNECTIONS</span><h2>Brachial plexus</h2><p>Select a root or branch to follow documented fiber contributions. Individual anatomy varies.</p></div>
  {selectedId&&<TraceControls id={selectedId} direction={direction} onDirection={onDirection} onSelect={onSelect}/>}<div className="plexus-scroll"><svg viewBox="0 0 815 530" className="plexus-svg" role="img" aria-label="Interactive brachial plexus connectivity diagram">
   {headings.map((h,i)=><text key={h} x={28+i*155} y={31} className="graph-heading">{h}</text>)}
   {edges.map(([from,to])=>{const a=coords.get(from)!,b=coords.get(to)!,active=traced.has(from)&&traced.has(to);return <path key={from+to} d={`M ${a.x+112} ${a.y+20} C ${a.x+136} ${a.y+20}, ${b.x-22} ${b.y+20}, ${b.x} ${b.y+20}`} className={'plexus-edge '+(active?'active':'')}/>;})}
   {columns.flat().map(id=>{const p=coords.get(id)!,active=traced.has(id);return <g key={id} role="button" aria-label={nameOf(id)} aria-pressed={selectedId===id} tabIndex={0} onClick={()=>onSelect(id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id);}}} className={'plexus-node '+(active?'active ':'')+(selectedId===id?'selected':'')}><rect x={p.x} y={p.y} width={112} height={42} rx={9}/><text x={p.x+56} y={p.y+25} textAnchor="middle">{short(id)}</text></g>;})}
  </svg></div>
  <div className="graph-caption"><span>Connectivity diagram</span><span>Root contributions follow the documented branching map.</span></div>
  {selectedId&&<div className="trace-summary"><span className="eyebrow">{nameOf(selectedId)}</span><p>{nerve(byId.get(selectedId)!)?.rootValues?.join(' · ')}</p>{collateral.length>0&&<div className="related-chips">{collateral.map(id=><button key={id} onClick={()=>onSelect(id)}>{nameOf(id)}</button>)}</div>}</div>}
 </div>;
}
