'use client';
import { nameOf, systemLabels, muscle, nerve, vessel, movement, clinical, database, colors,landmarkAnnotations } from '@atlas/lib/anatomy';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@atlas/components/ui/tabs';
import { Focus, ScanLine, EyeOff, ArrowUpRight, GitBranch, Droplets, Link2, Info } from 'lucide-react';
import BoneStudy from './BoneStudy';
import MuscleStudy from './MuscleStudy';
import type { BoneMode } from '@atlas/lib/anatomy/study';
import type { Entity } from '@atlas/lib/anatomy/schema';
interface Props{entity:Entity|null;onSelect:(id:string)=>void;onAction:(action:string,id:string)=>void;isolated:boolean;boneMode:BoneMode;onBoneMode:(mode:BoneMode)=>void;}
function Fact({label,children}:{label:string;children:React.ReactNode}){return <div className="anatomy-fact"><dt>{label}</dt><dd>{children}</dd></div>;}
export default function AnatomyInfo({entity:e,onSelect,onAction,isolated,boneMode,onBoneMode}:Props){
 if(!e)return <div className="info-empty"><ScanLine size={29}/><h2>Your anatomy, connected.</h2><p>Select a structure in the model or search the atlas to explore its attachments, supply and clinical relationships.</p><button onClick={()=>onSelect('supraspinatus')} className="primary-button">Explore the rotator cuff <ArrowUpRight size={16}/></button></div>;
 const links=(ids:string[])=>ids.length?<div className="inline-links">{ids.map(id=><button key={id} onClick={()=>onSelect(id)}>{nameOf(id)}<ArrowUpRight size={12}/></button>)}</div>:<span className="muted">Not yet mapped</span>;
 const hasAsset=!!e.assetIds.length;
 return <><div className="info-heading"><div className="entity-meta"><span style={{background:colors[e.system]}}/>{systemLabels[e.system]}<span className="dot-separator">/</span>{e.region}</div><h2>{e.name}</h2><div className="source-state">{hasAsset?'Source model available':landmarkAnnotations.has(e.id)?'Source landmark annotation · area not segmented':'Awaiting a validated 3D asset'}</div></div>
  {hasAsset&&<div className="object-actions"><button onClick={()=>onAction('focus',e.id)}><Focus size={16}/>Focus</button><button className={isolated?'active':''} onClick={()=>onAction('isolate',e.id)}><ScanLine size={16}/>{isolated?'End isolation':'Isolate'}</button><button onClick={()=>onAction('hide',e.id)}><EyeOff size={16}/>Hide</button>{['ghost','transparent','restore'].map(action=><button key={action} onClick={()=>onAction(action,e.id)}>{action==='transparent'?'Transparency':action.charAt(0).toUpperCase()+action.slice(1)}</button>)}</div>}
  <Tabs defaultValue="anatomy" key={e.id} className="info-tabs"><TabsList variant="line" className="info-tab-list"><TabsTrigger value="anatomy">Anatomy</TabsTrigger><TabsTrigger value="connections">Connections</TabsTrigger><TabsTrigger value="sources">Sources</TabsTrigger></TabsList>
   <TabsContent value="anatomy" className="info-tab-content"><dl>
   {e.system==='muscle'?<MuscleStudy key={e.id} muscle={muscle(e)} onSelect={onSelect} onAction={onAction}/>:e.system==='nerve'?<>
    <button className="inline-action" onClick={()=>onAction('trace',e.id)}><GitBranch size={15}/>Trace roots and branches</button><Fact label="Root values">{nerve(e).rootValues.join(' · ')}</Fact><Fact label="Origin">{links(nerve(e).parentIds)}</Fact>
    <Fact label="Course"><ol>{nerve(e).course.map((c,i)=><li key={i}>{c}</li>)}</ol></Fact><Fact label="Motor supply">{links(nerve(e).motorIds)}</Fact>
    <Fact label="Sensory distribution">{nerve(e).sensory.join('; ')||'Contributions follow the connected peripheral nerves.'}</Fact><Fact label="Branches">{links(nerve(e).branchIds)}</Fact>
    {e.description&&<Fact label="Clinical pattern">{e.description}</Fact>}<Fact label="Lesion comparisons">{links(nerve(e).lesionIds)}</Fact>
   </>:e.system==='artery'||e.system==='vein'?<>
    <button className="inline-action" onClick={()=>onAction('trace',e.id)}><Droplets size={15}/>{e.system==='artery'?'Trace arterial branches':'Trace venous tributaries'}</button><Fact label={e.system==='artery'?'Origin':'Drains to'}>{links(vessel(e).parentIds)}</Fact><Fact label="Course"><ol>{vessel(e).course.map((c,i)=><li key={i}>{c}</li>)}</ol></Fact>
    <Fact label={e.system==='artery'?'Branches':'Tributaries'}>{links(vessel(e).branchIds)}</Fact>{e.description&&<Fact label="Supply and relationships">{e.description}</Fact>}
    {vessel(e).anastomosisIds.length>0&&<Fact label="Anastomoses">{links(vessel(e).anastomosisIds)}</Fact>}
    {e.fields['Clinical significance']&&<Fact label="Clinical significance">{e.fields['Clinical significance']}</Fact>}
   </>:e.system==='movement'?<>
    <Fact label="Movement">{e.description}</Fact><Fact label="Prime movers">{links(movement(e).primeMoverIds)}</Fact><Fact label="Assistants">{links(movement(e).assistantIds)}</Fact><Fact label="Antagonists">{links(movement(e).antagonistIds)}</Fact><Fact label="Joints">{links(movement(e).jointIds)}</Fact><Fact label="Nerve supply">{links(movement(e).nerveIds)}</Fact>
   </>:e.system==='clinical'?<>
    <Fact label="Anatomical mechanism">{clinical(e).mechanism}</Fact><Fact label="What you see">{clinical(e).presentation}</Fact><Fact label="Important distinction">{clinical(e).comparison}</Fact><Fact label="Nerve / lesion site">{links(clinical(e).lesionIds)}</Fact><Fact label="Related anatomy">{links(clinical(e).affectedIds)}</Fact>
   </>:<>{e.system==='bone'&&<BoneStudy boneId={e.id} mode={boneMode} onMode={onBoneMode} onSelect={onSelect}/>}{e.description&&<p className="entity-description">{e.description}</p>}{Object.entries(e.fields).map(([label,value])=><Fact key={label} label={label}>{Array.isArray(value)?<ul>{value.map((v,i)=><li key={i}>{v}</li>)}</ul>:value}</Fact>)}</>}
   </dl></TabsContent>
   <TabsContent value="connections" className="info-tab-content"><div className="connections-intro"><Link2 size={16}/><span>{e.relations.length} anatomical connections</span></div>{[...new Set(e.relations.map(r=>r.type))].map(type=><div className="connection-group" key={type}><h3>{type}</h3>{e.relations.filter(r=>r.type===type).map((r,i)=><button key={r.targetId+i} onClick={()=>onSelect(r.targetId)}><span>{nameOf(r.targetId)}{r.detail&&<small>{r.detail}</small>}</span><ArrowUpRight size={15}/></button>)}</div>)}</TabsContent>
   <TabsContent value="sources" className="info-tab-content"><div className="review-notice"><Info size={17}/><p>Knowledge records and source models remain subject to independent anatomical review. Source availability does not certify attachment surfaces or movement rigs.</p></div>{e.sourceIds.map(id=>database.sources.find(s=>s.id===id)).filter(Boolean).map(source=><a className="source-link" key={source!.id} href={source!.url} target="_blank" rel="noreferrer"><span>{source!.title}<small>{source!.license??'Reference for review'}</small></span><ArrowUpRight size={16}/></a>)}<p className="record-id">Record: {e.id}</p></TabsContent>
  </Tabs>
 </>;
}
