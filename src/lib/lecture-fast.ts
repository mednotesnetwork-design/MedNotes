/** Fast, literal PDF text ingestion. This is source extraction, NOT AI summarization.
 * Each retained point has the same stable IDs and provenance as the Python backend.
 * Diagrams not represented in the PDF text layer remain explicitly unverified.
 */
export type FastPoint={id:string;page:number;kind:'text';text:string;origin:'text';item_id:string;page_number:number;content_type:'text';source_ref:string};
export type FastPage={number:number;text:string;image?:string;title?:string;points?:Array<{id:string;page:number;text:string}>;warnings?:string[]};
export type FastCard={id:string;title:string;source_ids:string[]};
export type FastUnit={id:string;title:string;objective:string;cards:FastCard[]};
export function extractTextPoints(page:number,text:string):FastPoint[]{
 const points:FastPoint[]=[];
 for(let i=0;i<text.length;i+=900){
  const part=text.slice(i,i+900);
  if(!part.trim())continue;
  const id='p'+page+'-t'+(Math.floor(i/900)+1);
  points.push({id,page,kind:'text',text:part,origin:'text',item_id:id,
   page_number:page,content_type:'text',source_ref:'lecture:page:'+page+':item:'+id});
 }
 return points;
}
export function sourcePageTitle(page:FastPage):string{
 const candidate=(page.title||page.text.split(/\r?\n/).map(x=>x.trim()).find(x=>x.length>=5)||'').replace(/\s+/g,' ').slice(0,125);
 return candidate||('صفحة '+page.number);
}
export function buildFastSourcePlan(pages:FastPage[],lectureTitle:string):{title:string;units:FastUnit[]}{
 const mapped=pages.filter(page=>page.points?.length);
 const groupSize=Math.max(1,Math.ceil(mapped.length/60));
 const units:FastUnit[]=[];
 for(let i=0;i<mapped.length;i+=groupSize){
  const group=mapped.slice(i,i+groupSize);
  const id='u'+(units.length+1),cards:FastCard[]=[];
  const list=group.flatMap(page=>page.points||[]);
  for(let at=0;at<list.length;){
   const selected:string[]=[];let length=0;
   while(at<list.length&&selected.length<8&&(!selected.length||length+list[at].text.length<=14000)){
    selected.push(list[at].id);length+=list[at].text.length;at++;
   }
   cards.push({id:id+'-c'+(cards.length+1),title:sourcePageTitle(group[Math.min(group.length-1,Math.floor((at-1)*group.length/Math.max(1,list.length)))]),source_ids:selected});
  }
  units.push({id,title:groupSize===1?sourcePageTitle(group[0]):('المحتوى من الصفحات '+group[0].number+'–'+group[group.length-1].number),
   objective:'استيعاب المعلومات المستخرجة من المصدر الأصلي دون اختلاق تفاصيل غير موجودة',cards});
 }
 const expected=mapped.flatMap(page=>page.points||[]).map(point=>point.id);
 const actual=units.flatMap(unit=>unit.cards.flatMap(card=>card.source_ids));
 if(actual.length!==expected.length||actual.some(id=>!expected.includes(id))||new Set(actual).size!==expected.length)
  throw new Error('فشل التحقق من حفظ جميع نقاط النص الأصلي.');
 return {title:lectureTitle.slice(0,180),units};
}
