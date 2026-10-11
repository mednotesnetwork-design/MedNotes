import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {z} from 'zod';
import type {Course} from '../components/study/LectureCourse';
import {loadLectureOriginal,saveLectureOriginal,saveLectureRecord} from './study-store';
const text=z.string().max(100000),strings=z.array(text).max(2000);
const point=z.object({id:z.string().max(120),page:z.number().int().min(1).max(300),kind:z.string(),text,origin:z.string()}).passthrough();
const clinicalText=z.object({text,source_item_ids_used:strings});
const explanation=z.object({
 explanation:text,high_yield:strings,terms:z.array(z.object({term:text,meaning:text})),clarifications:strings,
 mechanism:z.array(z.object({label:text,detail:text.optional(),system:text.optional(),source_quote:text})),
 questions:z.array(z.object({question:text,concept:text.optional(),options:strings.min(2).max(6),correct_index:z.number().int().min(0).max(5),explanations:strings,source_quote:text}).refine(q=>q.correct_index<q.options.length&&q.explanations.length===q.options.length)),
 source_quotes:strings,summary:strings.optional(),coverage:z.array(z.object({source_id:text,explanation:text})).optional(),
 opening:z.object({kind:z.enum(['case','question','none']),scene:text,prompt:text,answer:text,basis:z.enum(['lecture','additional']),source_quote:text}).optional(),
 visual:z.object({kind:text,title:text,caption:text,labels:z.array(z.object({label:text,detail:text,system:text.optional()})),source_quotes:strings,skin_features:strings.optional()}).passthrough().optional(),
 clinical_layers:z.object({core_concept:clinicalText,mechanism:z.object({steps:z.array(clinicalText)}),clinical_correlation:clinicalText,visual_cues:z.array(z.object({label:text,detail:text,source_item_ids_used:strings}))}).optional(),
 clinical_connection:z.object({text,basis:z.enum(['lecture','additional']),source_quote:text}).optional(),
 checkpoint:z.object({question:text,answer:text,concept:text,source_quote:text}).optional(),
 textbook_layouts:z.array(z.union([
  z.object({kind:z.literal('comparison_table'),title:text,columns:strings,rows:z.array(z.object({cells:strings,source_item_ids_used:strings}))}),
  z.object({kind:z.enum(['classification_grid','tissue_layers','flowchart','radial_map','hierarchy_tree','comparison_map']),title:text,nodes:z.array(z.object({label:text,detail:text,source_item_ids_used:strings}))})
 ])).optional(),
 clinical_callouts:z.array(z.object({kind:z.enum(['clinical','warning','high_yield']),text,source_item_ids_used:strings})).optional(),
 source_registry:z.array(z.object({item_id:text,page_number:z.number().optional(),content_type:text,source_ref:text,bbox:z.array(z.number()).nullable().optional()})).optional()
}).passthrough();
const schema=z.object({name:z.string().max(1000),pages:z.array(z.object({number:z.number().int().min(1).max(300),text,image:z.string().max(2700000).regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/).optional(),title:text.optional(),points:z.array(point).max(200).optional(),warnings:strings.optional(),visionChecked:z.boolean().optional()})).max(300),
 active:z.number().int().min(0),mode:z.enum(['lecture_only','supplemental']),ingestComplete:z.boolean().optional(),
 plan:z.object({title:text,units:z.array(z.object({id:text,title:text,objective:text,cards:z.array(z.object({id:text,title:text,source_ids:strings}))})).max(600)}).optional(),
 concepts:z.array(z.object({id:text,title:text,objective:text,unit_ids:strings})).optional(),activeConcept:z.number().int().min(0).optional(),semanticClustering:z.boolean().optional(),
 lessons:z.record(z.string(),explanation),conceptOverviews:z.record(z.string(),explanation).optional(),turns:z.record(z.string(),z.array(z.object({question:text,lesson:explanation}))),answers:z.record(z.string(),z.number().int().min(0).max(5)),notes:z.record(z.string(),text).optional(),planningNotices:strings.optional()
});
export function decodeLectureArchive(bytes:Uint8Array):{course:Course;original?:File}{
 if(bytes.byteLength>80*1024*1024)throw new Error('النسخة الاحتياطية تتجاوز 80 MB.');
 let size=0,count=0;
 const files=unzipSync(bytes,{filter:f=>{size+=f.originalSize;count++;if(size>150*1024*1024||count>3)throw new Error('النسخة الاحتياطية أكبر من الحدود المسموحة.');return ['manifest.json','course.json','original.bin'].includes(f.name);}});
 if(!files['manifest.json']||!files['course.json'])throw new Error('هذا الملف ليس نسخة MedNote صالحة.');
 const manifest=z.object({format:z.literal('mednote-lecture'),version:z.literal(1),original:z.object({name:z.string().max(1000),type:z.string().max(200)}).optional()}).parse(JSON.parse(strFromU8(files['manifest.json'])));
 const parsed=schema.safeParse(JSON.parse(strFromU8(files['course.json'])));
 if(!parsed.success)throw new Error('بنية النسخة الاحتياطية غير صالحة؛ لم تتغير محاضراتك المحفوظة.');
 const data=parsed.data;
 const ids=data.pages.flatMap(p=>p.points||[]).map(p=>p.id),cardIds=data.plan?.units.flatMap(u=>u.cards.map(c=>c.id))||[];
 if(new Set(ids).size!==ids.length||new Set(cardIds).size!==cardIds.length||new Set(data.pages.map(p=>p.number)).size!==data.pages.length)throw new Error('النسخة تحتوي على معرفات مصادر مكررة.');
 if(data.plan?.units.some(u=>u.cards.some(c=>c.source_ids.some(id=>!ids.includes(id)))))throw new Error('خريطة مصادر النسخة غير مكتملة.');
 if(data.concepts?.some(c=>c.unit_ids.some(id=>!data.plan?.units.some(u=>u.id===id))))throw new Error('خريطة المفاهيم لا تطابق المحاضرة.');
 const course={...data,id:crypto.randomUUID(),active:Math.min(data.active,Math.max(0,cardIds.length-1)),activeConcept:Math.min(data.activeConcept||0,Math.max(0,(data.concepts?.length||0)-1)),phase:data.plan?'ready':'extracting'} as Course;
 const original=manifest.original&&files['original.bin']?new File([files['original.bin'].slice().buffer],manifest.original.name,{type:manifest.original.type}):undefined;
 if(course.ingestComplete===false&&!original)throw new Error('الأصل مطلوب لاستكمال هذه النسخة لكنه غير موجود.');
 return {course,original};
}
export async function makeLectureArchive(course:Course):Promise<Blob>{
 const original=course.id?await loadLectureOriginal(course.id):undefined;
 const manifest={format:'mednote-lecture',version:1,original:original?{name:course.name,type:original.type}:undefined};
 // No remote job tokens or provider configuration travel in a personal backup.
 const {remote,remoteProgress,planning,...saved}=course;
 const files:Record<string,Uint8Array>={'manifest.json':strToU8(JSON.stringify(manifest)),'course.json':strToU8(JSON.stringify(saved))};
 if(original)files['original.bin']=new Uint8Array(await original.arrayBuffer());
 return new Blob([zipSync(files,{level:1}).slice().buffer],{type:'application/zip'});
}
export async function restoreLectureArchive(file:File):Promise<Course>{
 if(file.size>80*1024*1024)throw new Error('النسخة الاحتياطية تتجاوز 80 MB.');
 const {course,original}=decodeLectureArchive(new Uint8Array(await file.arrayBuffer()));
 if(original)await saveLectureOriginal(course.id!,original);
 await saveLectureRecord(course);return course;
}
