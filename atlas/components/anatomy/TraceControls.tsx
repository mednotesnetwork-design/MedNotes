'use client';
import { ArrowDown,ArrowUp,GitBranch,ArrowUpRight } from 'lucide-react';
import { Tabs,TabsList,TabsTrigger } from '@atlas/components/ui/tabs';
import { byId,nameOf,nerve,vessel } from '@atlas/lib/anatomy';
import { tracedIds,nerveTargets } from '@atlas/lib/anatomy/study';
export type TraceDirection='up'|'down'|'both';
export default function TraceControls({id,direction,onDirection,onSelect}:{id:string;direction:TraceDirection;onDirection:(v:TraceDirection)=>void;onSelect:(id:string)=>void}){
 const e=byId.get(id);if(!e||!['nerve','artery','vein'].includes(e.system))return null;
 const traced=tracedIds(id,direction).filter(i=>i!==id),isNerve=e.system==='nerve',isVein=e.system==='vein';
 const targets=isNerve?nerveTargets(id):vessel(e).supplyIds;
 return <section className="trace-controls"><div className="trace-heading"><GitBranch size={17}/><strong>{e.name}</strong></div><Tabs value={direction} onValueChange={v=>onDirection(v as TraceDirection)}><TabsList className="trace-direction"><TabsTrigger value="up"><ArrowUp size={14}/>{isVein?'To heart':'Proximal'}</TabsTrigger><TabsTrigger value="both">Full route</TabsTrigger><TabsTrigger value="down"><ArrowDown size={14}/>{isVein?'Tributaries':'Distal'}</TabsTrigger></TabsList></Tabs><p className="trace-note">{isNerve?`Contributing roots: ${nerve(e).rootValues.join(' · ')}. Tracing preserves these fiber contributions across each branch.`:isVein?'Parent links point toward venous return. Tributaries show the distal collecting pathways.':'Proximal links lead toward the aorta; distal links follow this vessel’s branches.'}</p><div className="trace-route">{traced.map(n=><button key={n} onClick={()=>onSelect(n)}>{nameOf(n)}<ArrowUpRight size={13}/></button>)}</div>{targets.length>0&&<details className="trace-targets"><summary>{isNerve?'Motor targets':'Supply targets'} · {targets.length}</summary><div className="study-link-list">{targets.map(n=><button key={n} onClick={()=>onSelect(n)}>{nameOf(n)}<ArrowUpRight size={14}/></button>)}</div></details>}</section>;
}
