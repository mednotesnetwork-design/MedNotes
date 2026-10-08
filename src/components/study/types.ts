export type Basis = 'lecture' | 'additional';
export type StudyQuestion = {question:string;concept?:string;options:string[];correct_index:number;explanations:string[];source_quote:string};
export type Explanation = {
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
