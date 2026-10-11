import {pdfjs} from 'react-pdf';
import {readPowerPoint} from '../../lib/lecture-pptx';
import type {Source} from './studio-types';

function preview(canvas:HTMLCanvasElement){
 let result=canvas.toDataURL('image/jpeg',.68);
 for(let quality=.56;result.length>600000&&quality>=.28;quality-=.10)result=canvas.toDataURL('image/jpeg',quality);
 if(result.length>650000)throw new Error('صورة الصفحة أكبر من الحد الآمن؛ يلزم مصدر بدقة أقل.');
 return result;
}
export async function ingestLecture(file:File,signal:AbortSignal,onPage:(page:Source,total:number)=>Promise<void>){
 if(file.size>30*1024*1024)throw new Error('الملفات المدعومة حتى 30 MB.');
 const lower=file.name.toLowerCase();
 if(lower.endsWith('.pdf')||file.type==='application/pdf'){
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
  try{
   if(pdf.numPages>300)throw new Error('الحد الأقصى 300 صفحة.');
   for(let n=1;n<=pdf.numPages;n++){
    signal.throwIfAborted();
    const page=await pdf.getPage(n),layer=await page.getTextContent();
    const text=layer.items.map(x=>'str'in x?x.str+(x.hasEOL?'\n':' '):'').join('');
    if(text.length>7000)throw new Error('صفحة '+n+' تحتوي نصًا كبيرًا؛ قسّمي المحاضرة لتجنب فقد معلومات.');
    const basic=page.getViewport({scale:1});
    const view=page.getViewport({scale:Math.min(1.8,1150/Math.max(basic.width,basic.height))});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
    try{await page.render({canvas,viewport:view}).promise;
     await onPage({id:'p'+n,page:n,title:text.split('\n').find(t=>t.trim().length>4)?.trim().slice(0,140)||'صفحة '+n,text,image:preview(canvas),warnings:[],visionDone:false},pdf.numPages);
    }finally{canvas.width=0;canvas.height=0;page.cleanup();}
   }
  }finally{await pdf.destroy();}
  return;
 }
 if(lower.endsWith('.pptx')){
  await readPowerPoint(file,signal,async(page,total)=>onPage({id:'p'+page.number,page:page.number,title:page.title,text:page.text.slice(0,7000),image:page.image,warnings:page.warnings,visionDone:false},total));return;
 }
 if(file.type.startsWith('image/')){
  const bitmap=await createImageBitmap(file);
  try{const scale=Math.min(1,1150/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');
   canvas.width=Math.ceil(bitmap.width*scale);canvas.height=Math.ceil(bitmap.height*scale);
   try{canvas.getContext('2d')?.drawImage(bitmap,0,0,canvas.width,canvas.height);
    await onPage({id:'p1',page:1,title:file.name,text:'',image:preview(canvas),warnings:[],visionDone:false},1);
   }finally{canvas.width=0;canvas.height=0;}
  }finally{bitmap.close();}return;
 }
 if(lower.endsWith('.txt')){
  const raw=await file.text(),segments=raw.match(/[\s\S]{1,5500}/g)||[];
  if(segments.length>300)throw new Error('النص طويل جدًا؛ قسّمي الملف.');
  for(let i=0;i<segments.length;i++){signal.throwIfAborted();await onPage({id:'p'+(i+1),page:i+1,title:'جزء '+(i+1),text:segments[i],warnings:[],visionDone:true},segments.length);}return;
 }
 throw new Error('ارفعي PDF أو PPTX أو صورة أو TXT.');
}
