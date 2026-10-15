/**
 * A lecture presents major concepts, not one slide for each extracted source
 * point. Legacy unit/card IDs never change: existing approved explanations,
 * quiz answers and saved notes remain valid across migration.
 */
export type LectureCard={id:string;title:string;source_ids:string[]};
export type LectureUnit={id:string;title:string;objective:string;cards:LectureCard[]};
export type MainConcept={id:string;title:string;objective:string;unit_ids:string[]};
export type ConceptGrouping={concepts:MainConcept[];semantic_clustering:boolean};
export function validateConceptGrouping(units:LectureUnit[],value:ConceptGrouping,max=10):MainConcept[]{
 if(!Array.isArray(value.concepts)||!value.concepts.length||value.concepts.length>max)throw new Error('عدد المفاهيم الرئيسية غير صحيح.');
 const ids=new Set(units.map(u=>u.id)),seen=new Set<string>();
 for(const concept of value.concepts){
  if(!concept.id||!concept.title?.trim()||!Array.isArray(concept.unit_ids)||!concept.unit_ids.length)throw new Error('فكرة رئيسية غير مكتملة.');
  for(const id of concept.unit_ids){
   if(!ids.has(id)||seen.has(id))throw new Error('خريطة المفاهيم فقدت مصدرًا أو كررت وحدة.');
   seen.add(id);
  }
 }
 if(seen.size!==ids.size)throw new Error('ليست جميع الوحدات مرتبطة بمفهوم رئيسي.');
 return value.concepts;
}
export function conceptBranches(concept:MainConcept,units:LectureUnit[]):LectureUnit[]{
 const byId=new Map(units.map(u=>[u.id,u]));
 return concept.unit_ids.map(id=>byId.get(id)).filter((u):u is LectureUnit=>!!u);
}
export function conceptCards(concept:MainConcept,units:LectureUnit[]):LectureCard[]{
 return conceptBranches(concept,units).flatMap(unit=>unit.cards);
}
export function findConceptIndex(concepts:MainConcept[],units:LectureUnit[],cardId:string){
 const index=concepts.findIndex(c=>conceptCards(c,units).some(card=>card.id===cardId));
 return Math.max(0,index);
}
export function conceptSourceIds(concept:MainConcept,units:LectureUnit[]):string[]{
 return conceptCards(concept,units).flatMap(c=>c.source_ids);
}
/** Provisional, openly flagged groups when Gemini is unavailable.
 * Preserve source grouping; never present heuristic clustering as AI output. */
export function provisionalConcepts(units:LectureUnit[],pages:number):MainConcept[]{
 if(!units.length)return [];
 const target=Math.min(units.length,pages<=10?5:pages<=20?6:pages<=35?7:9,10);
 return Array.from({length:target},(_,index)=>{
  const part=units.slice(Math.floor(index*units.length/target),Math.floor((index+1)*units.length/target));
  return {id:'concept-'+(index+1),title:part[0].title,objective:part[0].objective,
   unit_ids:part.map(u=>u.id)};
 });
}
