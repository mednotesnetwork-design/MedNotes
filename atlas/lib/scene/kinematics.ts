import { Matrix4,Vector3 } from 'three';
import { rigProfiles,type JointTrack } from '@atlas/lib/anatomy/demonstrations';
export {motionIds,poseIds} from '@atlas/lib/anatomy/demonstrations';
/** Compose reviewed tracks in proximal-to-distal order in the source rest frame.
 * Coordinates live in versioned, asset-specific profiles, never guessed at runtime.
 * Soft-tissue deformation requires its own reviewed rig; this engine moves bones.
 */
export function trackMatrix(track:JointTrack,progress:number){
 const values=[...track.pivot,...track.axis,track.fromDegrees,track.toDegrees,...(track.translation??[])];
 if(!values.every(Number.isFinite))throw new Error('Non-finite anatomical rig coordinates');
 const axis=new Vector3(...track.axis);if(axis.lengthSq()<1e-10)throw new Error('Anatomical joint axis is undefined');axis.normalize();
 const t=Math.max(0,Math.min(1,progress)),angle=(track.fromDegrees+(track.toDegrees-track.fromDegrees)*t)*Math.PI/180;
 const p=new Vector3(...track.pivot),shift=new Vector3(...(track.translation??[0,0,0])).multiplyScalar(t);
 return new Matrix4().makeTranslation(p.x+shift.x,p.y+shift.y,p.z+shift.z).multiply(new Matrix4().makeRotationAxis(axis,angle)).multiply(new Matrix4().makeTranslation(-p.x,-p.y,-p.z));
}
export function poseMatrices(movementId:string,progress:number,poseId:string|null,_clinicalLevel?:string){
 const map=new Map<string,Matrix4>();
 const profile=rigProfiles.find(p=>poseId?p.clinical[poseId]:p.movements[movementId]);if(!profile)return map;
 const tracks=poseId?profile.clinical[poseId]:profile.movements[movementId];
 for(const track of tracks){const transform=trackMatrix(track,progress);for(const id of track.targetIds){const previous=map.get(id)??new Matrix4();map.set(id,previous.multiply(transform));}}
 return map;
}
