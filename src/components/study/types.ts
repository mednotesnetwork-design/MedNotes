export type SourceRegistryItem={item_id:string;page_number?:number;content_type:string;source_ref:string;bbox?:number[]|null};
export type ClinicalLayerText={text:string;source_item_ids_used:string[]};
export type ClinicalLayers={
 core_concept:ClinicalLayerText;
 mechanism:{steps:ClinicalLayerText[]};
 clinical_correlation:ClinicalLayerText;
 visual_cues:{label:string;detail:string;source_item_ids_used:string[]}[];
};
export type TextbookLayout=
 |{kind:'comparison_table';title:string;columns:string[];rows:{cells:string[];source_item_ids_used:string[]}[]}
 |{kind:'classification_grid'|'tissue_layers'|'flowchart'|'radial_map'|'hierarchy_tree'|'comparison_map';title:string;nodes:{label:string;detail:string;source_item_ids_used:string[]}[]};
export type ClinicalCallout={kind:'clinical'|'warning'|'high_yield';text:string;source_item_ids_used:string[]};
export type Basis = 'lecture' | 'additional';
export type StudyQuestion = {question:string;concept?:string;options:string[];correct_index:number;explanations:string[];source_quote:string};
export type Explanation = {
 textbook_layouts?:TextbookLayout[];
 clinical_callouts?:ClinicalCallout[];
 clinical_layers?:ClinicalLayers;
 source_registry?:SourceRegistryItem[];
 coverage?:{source_id:string;explanation:string}[];
 review_note?:string;id?:string;requested_tool?:string;source_mode?:string;
 opening?:{kind:'case'|'question'|'none';scene:string;prompt:string;answer:string;basis:Basis;source_quote:string};
 visual?:{kind:'diagram'|'sequence'|'comparison'|'anatomy'|'clinical'|'skin'|'nmj'|'none';title:string;caption:string;basis?:Basis;labels:{label:string;detail:string;system?:string}[];source_quotes:string[];skin_features?:string[]};
 explanation:string;high_yield:string[];terms:{term:string;meaning:string}[];clarifications:string[];
 mechanism:{label:string;detail?:string;system?:string;source_quote:string}[];
 clinical_connection?:{text:string;basis:Basis;source_quote:string};
 checkpoint?:{question:string;answer:string;concept:string;source_quote:string};
 summary?:string[];questions:StudyQuestion[];source_quotes:string[];
};
