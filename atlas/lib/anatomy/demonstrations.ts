import profiles from './data/rig-profiles.json';
import { byAsset } from './index';
export interface JointTrack {targetIds:string[];pivot:[number,number,number];axis:[number,number,number];fromDegrees:number;toDegrees:number;translation?:[number,number,number];}
export interface RigProfile {id:string;assetIds:string[];review:'validated'|'awaiting-review';reviewer:string;sourceIds:string[];movements:Record<string,JointTrack[]>;clinical:Record<string,JointTrack[]>;}
// A legacy rig cannot silently act on a newly imported specimen. Each compatible
// profile must identify all required eligible assets and a completed anatomical review.
export const rigProfiles=(profiles as RigProfile[]).filter(p=>p.review==='validated'&&p.reviewer&&p.sourceIds.length&&p.assetIds.length&&p.assetIds.every(id=>byAsset.has(id)));
export const motionIds=new Set(rigProfiles.flatMap(p=>Object.keys(p.movements)));
export const poseIds=new Set(rigProfiles.flatMap(p=>Object.keys(p.clinical)));
