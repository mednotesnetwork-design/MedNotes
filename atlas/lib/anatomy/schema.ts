export type System = 'bone' | 'landmark' | 'joint' | 'ligament' | 'muscle' | 'nerve' | 'artery' | 'vein' | 'space' | 'clinical' | 'movement' | 'attachment' | 'surface';
export type Region = 'Shoulder girdle' | 'Shoulder' | 'Arm' | 'Elbow' | 'Forearm' | 'Wrist' | 'Hand';
export type ReviewState = 'source-mapped' | 'awaiting-review' | 'validated';
export interface Source { id:string; title:string; url:string; license?:string; attribution?:string; accessed:string; }
export interface Relation { type:string; targetId:string; detail?:string; }
export interface Asset { id:string; entityId:string; name:string; system:System; region:Region; provenance?:{license:'CC0-1.0'|'Public Domain'|'MedNote Original'|'CC-BY-4.0'|'CC-BY-SA-4.0';licenseUrl?:string;attributionNotice?:string;changes?:string;verified:boolean;dependenciesEligible:boolean;sourceUrl:string;sha256:string;creator:string;notes?:string}; landmarkId?:string; rigId?:string; role?:'anatomy'|'attachment-patch'|'attachment-support'|'landmark-area'|'clinical-specimen'; attachmentKind?:'origin'|'insertion'; muscleIds?:string[]; boneId?:string; triangles:number; url:string; format:'glb'|'mesh-json'; meshIds:string[]; sourceId:string; review:ReviewState; representation?:string; side:'right'|'left'|'midline'|'unspecified'; bounds?:number[][]; }
export interface Attachment { id:string; structureId:string; site:string; boneIds:string[]; landmarkIds:string[]; patchAssetId:string|null; review:ReviewState; }
export interface Entity {
 id:string; name:string; aliases:string[]; system:System; region:Region; description:string;
 sourceIds:string[]; review:ReviewState; relations:Relation[]; assetIds:string[];
 fields:Record<string,string|string[]>;
}
export interface Muscle extends Entity {
 system:'muscle'; lymphaticRelevance?:{contextId:string;scope:'regional';note:string}; attachmentSurfaceIds?:string[]; abbreviation:string; compartment:string; layer:string;
 origins:Attachment[]; insertions:Attachment[]; nerveIds:string[]; rootValues:string[];
 arteryIds:string[]; movementIds:string[]; secondaryActions:string[]; jointIds:string[];
 synergistIds:string[]; antagonistIds:string[]; clinicalIds:string[]; functionalRole:string;
}
export interface Nerve extends Entity { system:'nerve'; rootValues:string[]; parentIds:string[]; branchIds:string[]; course:string[]; motorIds:string[]; sensory:string[]; lesionIds:string[]; }
export interface Vessel extends Entity { system:'artery'|'vein'; parentIds:string[]; branchIds:string[]; anastomosisIds:string[]; course:string[]; supplyIds:string[]; }
export interface Joint extends Entity { system:'joint'; jointType:string; classification:string; surfaces:string[]; capsule:string; ligamentIds:string[]; movementIds:string[]; degreesOfFreedom:number; stabilizerIds:string[]; injuryIds:string[]; tests:string[]; }
export interface Movement extends Entity { system:'movement'; jointIds:string[]; primeMoverIds:string[]; assistantIds:string[]; antagonistIds:string[]; nerveIds:string[]; demonstration:{status:'awaiting-validated-rig'|'available';clipId:string|null}; }
export interface ClinicalCase extends Entity { system:'clinical'; mechanism:string; presentation:string; lesionIds:string[]; affectedIds:string[]; comparison:string; visual:{status:'awaiting-validated-asset'|'available';poseId:string|null}; }
export interface Database { version:string; sources:Source[]; entities:Entity[]; assets:Asset[]; }
