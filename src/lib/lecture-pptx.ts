import {unzipSync,strFromU8} from 'fflate';
export type PresentationPage={number:number;text:string;image:string;title:string;warnings:string[]};
const xml=(bytes:Uint8Array|undefined)=>{
 if(!bytes)throw new Error('جزء مفقود داخل PowerPoint.');
 const text=strFromU8(bytes);
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('تعريف XML غير مدعوم داخل الملف.');
 const doc=new DOMParser().parseFromString(text,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw new Error('تعذر قراءة XML داخل PowerPoint.');return doc;
};
const tags=(node:Document|Element,name:string)=>Array.from(node.getElementsByTagNameNS('*',name));
const resolve=(base:string,target:string)=>{const path=base.split('/').slice(0,-1);for(const part of target.split('/')){if(part==='..')path.pop();else if(part&&part!=='.')path.push(part);}return path.join('/');};
function relations(files:Record<string,Uint8Array>,path:string){
 const relPath=path.replace(/\/([^/]+)$/, '/_rels/$1.rels');
 const result=new Map<string,{path:string;type:string}>();
 if(files[relPath])for(const r of tags(xml(files[relPath]),'Relationship'))if(r.getAttribute('TargetMode')!=='External')result.set(r.getAttribute('Id')||'',{path:resolve(path,r.getAttribute('Target')||''),type:r.getAttribute('Type')||''});
 return result;
}
export async function readPowerPoint(file:File,signal:AbortSignal,onPage:(page:PresentationPage,total:number)=>Promise<void>){
 let totalBytes=0,count=0;
 const files=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:f=>{
  if(++count>5000||f.originalSize>25*1024*1024||(totalBytes+=f.originalSize)>150*1024*1024)throw new Error('ملف PowerPoint كبير بعد فك الضغط.');
  return /^(ppt|docProps)\//.test(f.name);
 }});
 const presentation=xml(files['ppt/presentation.xml']),rels=relations(files,'ppt/presentation.xml');
 const size=tags(presentation,'sldSz')[0],w=Number(size?.getAttribute('cx')||12192000),h=Number(size?.getAttribute('cy')||6858000);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)throw new Error('أبعاد الشرائح غير صالحة.');
 const ids=tags(presentation,'sldId');if(!ids.length||ids.length>300)throw new Error('PowerPoint يجب أن يحتوي 1–300 شريحة.');
 for(let index=0;index<ids.length;index++){
  signal.throwIfAborted();const id=ids[index].getAttribute('r:id')||'',path=rels.get(id)?.path;
  if(!path)throw new Error('تعذر تحديد ترتيب شرائح PowerPoint.');
  const doc=xml(files[path]),links=relations(files,path),warnings:string[]=[];
  const paragraphs=tags(doc,'p').map(p=>tags(p,'t').map(t=>t.textContent||'').join('')).filter(Boolean);
  for(const link of links.values()){
   if(/notesSlide$/.test(link.type)&&files[link.path]){
    const notes=tags(xml(files[link.path]),'sp').filter(s=>!tags(s,'ph').some(p=>['sldNum','sldImg'].includes(p.getAttribute('type')||''))).flatMap(s=>tags(s,'p').map(p=>tags(p,'t').map(t=>t.textContent||'').join(''))).filter(Boolean);
    if(notes.length)paragraphs.push('Speaker notes:',...notes);
   }
   if(/chart$/.test(link.type)&&files[link.path])paragraphs.push('Chart data:',...tags(xml(files[link.path]),'v').map(v=>v.textContent||''));
   if(/diagramData$/.test(link.type)&&files[link.path])paragraphs.push('Diagram labels:',...tags(xml(files[link.path]),'t').map(t=>t.textContent||''));
  }
  const text=paragraphs.join('\n');if(text.length>40000)throw new Error(`نص الشريحة ${index+1} يتجاوز الحد؛ لم يتم اقتطاعه.`);
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=Math.round(1600*h/w);if(canvas.height>3000)throw new Error('أبعاد شريحة غير مدعومة.');
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const sx=canvas.width/w,sy=canvas.height/h;
  const tree=tags(doc,'spTree')[0];
  for(const element of Array.from(tree?.children||[])){
   const xfrm=tags(element,'xfrm')[0],off=xfrm&&tags(xfrm,'off')[0],ext=xfrm&&tags(xfrm,'ext')[0];
   if(!off||!ext){if(tags(element,'t').length||element.localName==='graphicFrame')warnings.push('عنصر بتنسيق موروث: نصه محفوظ، لكن موضعه البصري يحتاج مراجعة الأصل.');continue;}
   const x=Number(off.getAttribute('x'))*sx,y=Number(off.getAttribute('y'))*sy,bw=Number(ext.getAttribute('cx'))*sx,bh=Number(ext.getAttribute('cy'))*sy;
   if(![x,y,bw,bh].every(Number.isFinite))continue;
   if(element.localName==='pic'){
    const imagePath=links.get(tags(element,'blip')[0]?.getAttribute('r:embed')||'')?.path,bytes=imagePath&&files[imagePath];
    if(bytes){try{const type=/\.png$/i.test(imagePath!)?'image/png':/\.jpe?g$/i.test(imagePath!)?'image/jpeg':/\.gif$/i.test(imagePath!)?'image/gif':undefined;
     if(!type)throw new Error('Unsupported image');
     const bitmap=await createImageBitmap(new Blob([bytes.slice().buffer as ArrayBuffer],{type}));ctx.drawImage(bitmap,x,y,bw,bh);bitmap.close();
    }catch{warnings.push('صورة أو رسم متجهي غير قابل للرسم؛ راجعي الأصل أو ارفعي نسخة PDF.');}}
   }else if(element.localName==='sp'){
    const fill=tags(element,'solidFill')[0],color=fill&&tags(fill,'srgbClr')[0]?.getAttribute('val');
    if(color&&/^[a-f\d]{6}$/i.test(color)){ctx.fillStyle='#'+color;ctx.fillRect(x,y,bw,bh);}
    let lineY=y+22;
    for(const p of tags(element,'p')){
     const value=tags(p,'t').map(t=>t.textContent||'').join('');if(!value)continue;
     const size=Math.max(13,Math.min(50,Number(tags(p,'rPr')[0]?.getAttribute('sz')||1800)/100*1.5));
     ctx.font=`${size}px Arial`;ctx.fillStyle='#152f30';
     let line='';for(const word of value.split(/\s+/)){if(ctx.measureText(line+' '+word).width>Math.max(40,bw)&&line){ctx.fillText(line,x+3,lineY);lineY+=size*1.2;line=word;}else line+=(line?' ':'')+word;}
     ctx.fillText(line,x+3,lineY);lineY+=size*1.3;
    }
   }else if(element.localName==='cxnSp'){
    ctx.strokeStyle='#506b65';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+bw,y+bh);ctx.stroke();
   }else if(element.localName==='graphicFrame'||element.localName==='grpSp')warnings.push('جدول أو رسم مركّب: البيانات النصية محفوظة، والمظهر يحتاج مراجعة ملف الأصل.');
  }
  if(tags(doc,'timing').length)warnings.push('حركات PowerPoint الأصلية لا تنتقل إلى المعاينة؛ المحتوى الثابت محفوظ.');
  warnings.push('معاينة PowerPoint تقريبية؛ احتُفظ بالملف الأصلي والنص والملاحظات. يُنصح بـPDF عند وجود SmartArt أو تنسيق مركّب.');
  signal.throwIfAborted();await onPage({number:index+1,text,title:paragraphs[0]?.slice(0,180)||`شريحة ${index+1}`,image:canvas.toDataURL('image/jpeg',.83),warnings:[...new Set(warnings)]},ids.length);canvas.width=0;canvas.height=0;
 }
}
