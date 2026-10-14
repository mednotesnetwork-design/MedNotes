import { useState } from "react";
import { FileText, Image as ImageIcon, Video, Layers, BookOpen, CircleHelp, ShieldCheck } from "lucide-react";

/** UI review component only. No backend mutation or upload is performed. */
type Kind = "Text" | "PDF" | "Image" | "Video" | "MCQ" | "Flashcards";
type Provenance = "Original explanation" | "Lecture-linked" | "Textbook/guideline/article" | "Official course material" | "AI-assisted";
type Audience = "Public" | "Followers";
type Comments = "Everyone" | "Limited" | "Paused" | "Off";
type Card = { front: string; back: string };
type Draft = {
  kind: Kind; title: string; body: string; file: File | null; alt: string;
  choices: string[]; correct: number; explanation: string; cards: Card[];
  university: string; college: string; year: string; module: string;
  provenance: Provenance; source: string; aiDisclosure: string;
  audience: Audience; comments: Comments; patientSafe: boolean; rightsConfirmed: boolean;
};
const initial: Draft = {
  kind:"Text",title:"",body:"",file:null,alt:"",choices:["","","",""],correct:0,explanation:"",
  cards:[{front:"",back:""}],university:"",college:"Medicine",year:"",module:"",
  provenance:"Original explanation",source:"",aiDisclosure:"",audience:"Public",comments:"Everyone",
  patientSafe:false,rightsConfirmed:false
};
const types: {id:Kind;label:string;icon:typeof FileText}[] = [
  {id:"Text",label:"Free Text",icon:BookOpen},{id:"PDF",label:"File / PDF",icon:FileText},
  {id:"Image",label:"Image",icon:ImageIcon},{id:"Video",label:"Video",icon:Video},
  {id:"MCQ",label:"MCQ",icon:CircleHelp},{id:"Flashcards",label:"Flashcards",icon:Layers}
];
const provenanceOptions: Provenance[] = ["Original explanation","Lecture-linked","Textbook/guideline/article","Official course material","AI-assisted"];
const field = "w-full rounded-xl border border-[#d5e4db] bg-white px-3 py-2.5 text-sm text-[#214b3f] focus:outline-none focus:ring-2 focus:ring-[#84b9a2]";
const panel = "rounded-2xl border border-[#dce8df] bg-white p-5 shadow-sm";
const label = "mb-1 block text-sm font-semibold text-[#355c4c]";
function errors(d: Draft, step: number): string[] {
  const result: string[] = [];
  if (step === 1) {
    if (d.title.trim().length < 5) result.push("Title must contain at least five characters.");
    if (d.kind === "Text" && d.body.trim().length < 20) result.push("Write an explanation of at least 20 characters.");
    if (["PDF","Image","Video"].includes(d.kind) && !d.file) result.push("Attach a supported file.");
    if (d.kind === "Image" && !d.alt.trim()) result.push("Provide an accessible image description.");
    if (d.kind === "MCQ") {
      if (!d.body.trim()) result.push("Add the question stem.");
      if (d.choices.length < 2 || d.choices.some(c => !c.trim())) result.push("Complete all answer options.");
      if (!d.choices[d.correct]?.trim()) result.push("Choose a correct answer.");
      if (!d.explanation.trim()) result.push("Explain the correct answer and distractors.");
    }
    if (d.kind === "Flashcards" && d.cards.some(c => !c.front.trim() || !c.back.trim())) result.push("Complete both sides of each card.");
  }
  if (step === 2) {
    if (!d.university.trim() || !d.module.trim()) result.push("University and module / subject are required.");
    if (!d.source.trim()) result.push("Explain the source or basis of this material.");
    if (d.provenance === "AI-assisted" && !d.aiDisclosure.trim()) result.push("Explain how AI contributed.");
    if (!d.patientSafe || !d.rightsConfirmed) result.push("Confirm patient privacy and sharing rights.");
  }
  return result;
}
export function CreatePost() {
  const [draft,setDraft] = useState<Draft>(initial);
  const [step,setStep] = useState(0);
  const [tried,setTried] = useState(false);
  const [fileError,setFileError] = useState("");
  const update = <K extends keyof Draft>(key:K,value:Draft[K]) => setDraft(d=>({...d,[key]:value}));
  const problems = errors(draft,step);
  const next = () => {setTried(true);if(problems.length) return;setTried(false);setStep(s=>Math.min(3,s+1));};
  const input = (key:"title"|"body"|"alt"|"explanation"|"university"|"college"|"year"|"module"|"source"|"aiDisclosure",text:string,area=false) =>
    <label key={key} className="block"><span className={label}>{text}</span>{area?
      <textarea className={field} rows={key==="body"?5:3} value={draft[key]} onChange={e=>update(key,e.target.value)} />:
      <input className={field} value={draft[key]} onChange={e=>update(key,e.target.value)} />}</label>;
  const selectFile = (file:File|undefined) => {
    if (!file) return;
    const mime = draft.kind === "PDF" ? ["application/pdf"] : draft.kind === "Image" ?
      ["image/png","image/jpeg","image/webp"] : ["video/mp4","video/webm"];
    if (!mime.includes(file.type) || file.size > 50*1024*1024) {
      setFileError("Unsupported file type or over 50 MB."); update("file",null); return;
    }
    setFileError("");update("file",file);
  };
  return <main className="mx-auto max-w-4xl px-4 py-8 text-[#204a3e]">
    <div className="mb-6"><p className="text-xs font-bold tracking-widest text-[#458367]">MEDNOTE / SOCIAL PUBLISHING</p>
      <h1 className="mt-2 text-3xl font-bold">Create post</h1>
      <p className="mt-2 text-sm text-[#688176]">Interactive review candidate. Nothing here is uploaded or published.</p></div>
    <nav aria-label="Publishing steps" className="mb-5 grid grid-cols-4 gap-2">
      {["Type","Content","Context","Preview"].map((name,i)=><button key={name} type="button" disabled={i>step}
        onClick={()=>{setStep(i);setTried(false)}} className={"rounded-lg p-2 text-xs font-semibold "+(i===step?"bg-[#245b4c] text-white":i<step?"bg-[#d9eee2]":"bg-[#edf2ed]")}>{i+1}. {name}</button>)}
    </nav>
    {step===0&&<section className={panel}><h2 className="mb-4 text-lg font-bold">Choose a format</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {types.map(({id,label:kindLabel,icon:Icon})=><button type="button" key={id} aria-pressed={draft.kind===id}
        onClick={()=>setDraft(d=>({...d,kind:id,file:null}))} className={"rounded-xl border p-4 text-left "+(draft.kind===id?"border-[#498a6e] bg-[#e9f5ed]":"border-[#dbe6dd]")}>
        <Icon size={23} className="mb-3 text-[#35795c]"/><strong className="text-sm">{kindLabel}</strong></button>)}</div></section>}
    {step===1&&<section className={panel}><h2 className="mb-4 text-lg font-bold">{draft.kind} · content</h2><div className="space-y-4">
      {input("title","Title *")}
      {draft.kind==="Text"&&input("body","Explanation *",true)}
      {["PDF","Image","Video"].includes(draft.kind)&&<><label className="block"><span className={label}>Attach {draft.kind} *</span>
        <input type="file" className={field} accept={draft.kind==="PDF"?"application/pdf":draft.kind==="Image"?"image/png,image/jpeg,image/webp":"video/mp4,video/webm"}
          onChange={e=>selectFile(e.target.files?.[0])}/><span className="text-xs text-[#688176]">Browser memory only · 50 MB maximum</span></label>
        {draft.file&&<p className="text-xs">{draft.file.name}</p>}{fileError&&<p role="alert" className="text-sm text-red-700">{fileError}</p>}
        {draft.kind==="Image"&&input("alt","Accessible description *",true)}
        {input("body","Caption / learning objective",true)}</>}
      {draft.kind==="MCQ"&&<>{input("body","Question stem *",true)}
        <fieldset><legend className={label}>Answer options · select the correct answer *</legend><div className="space-y-2">
          {draft.choices.map((choice,i)=><div key={i} className="flex gap-2">
            <input type="radio" name="correct" aria-label={"Correct option "+(i+1)} checked={draft.correct===i} onChange={()=>update("correct",i)}/>
            <input className={field} aria-label={"Option "+(i+1)} value={choice}
              onChange={e=>update("choices",draft.choices.map((c,j)=>j===i?e.target.value:c))}/>
            {draft.choices.length>2&&<button type="button" className="text-xs text-red-700" onClick={()=>setDraft(d=>({...d,choices:d.choices.filter((_,j)=>j!==i),correct:d.correct===i?0:d.correct>i?d.correct-1:d.correct}))}>Remove</button>}
          </div>)}</div>{draft.choices.length<6&&<button type="button" className="mt-2 text-sm font-semibold text-[#35795c]" onClick={()=>update("choices",[...draft.choices,""])}>+ Add option</button>}</fieldset>
        {input("explanation","Correct answer and distractor explanation *",true)}</>}
      {draft.kind==="Flashcards"&&<fieldset><legend className={label}>Cards *</legend>{draft.cards.map((card,i)=><div key={i} className="mb-3 space-y-2 rounded-xl border border-[#dce8df] p-3">
        <div className="flex justify-between text-sm font-semibold">Card {i+1}{draft.cards.length>1&&<button type="button" className="text-red-700" onClick={()=>update("cards",draft.cards.filter((_,j)=>j!==i))}>Remove</button>}</div>
        <input className={field} aria-label={"Card "+(i+1)+" front"} placeholder="Front" value={card.front} onChange={e=>update("cards",draft.cards.map((c,j)=>j===i?{...c,front:e.target.value}:c))}/>
        <textarea className={field} aria-label={"Card "+(i+1)+" back"} placeholder="Back" value={card.back} onChange={e=>update("cards",draft.cards.map((c,j)=>j===i?{...c,back:e.target.value}:c))}/>
      </div>)}{draft.cards.length<30&&<button type="button" className="text-sm font-semibold text-[#35795c]" onClick={()=>update("cards",[...draft.cards,{front:"",back:""}])}>+ Add card</button>}</fieldset>}
    </div></section>}
    {step===2&&<section className={panel}><h2 className="mb-4 text-lg font-bold">Academic context & source</h2><div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">{input("university","University *")}{input("college","College")}{input("year","Academic year")}{input("module","Module / subject *")}</div>
      <label className="block"><span className={label}>Provenance *</span><select className={field} value={draft.provenance} onChange={e=>update("provenance",e.target.value as Provenance)}>{provenanceOptions.map(p=><option key={p}>{p}</option>)}</select></label>
      {input("source","Traceable source / original basis *",true)}
      {draft.provenance==="AI-assisted"&&input("aiDisclosure","How was AI used? *",true)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={draft.patientSafe} onChange={e=>update("patientSafe",e.target.checked)}/>No identifiable patient information is included.</label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={draft.rightsConfirmed} onChange={e=>update("rightsConfirmed",e.target.checked)}/>I own or have permission to share the materials.</label>
      <p className="rounded-xl bg-[#f7f1e9] p-3 text-xs">A source label is not medical review. Server-side authorization, asset inspection, and content moderation remain required.</p>
    </div></section>}
    {step===3&&<section className={panel}><h2 className="mb-4 text-lg font-bold">Review audience & discussion</h2><div className="grid gap-4 sm:grid-cols-2">
      <label><span className={label}>Audience</span><select className={field} value={draft.audience} onChange={e=>update("audience",e.target.value as Audience)}><option>Public</option><option>Followers</option></select></label>
      <label><span className={label}>Comments</span><select className={field} value={draft.comments} onChange={e=>update("comments",e.target.value as Comments)}>{["Everyone","Limited","Paused","Off"].map(c=><option key={c}>{c}</option>)}</select></label>
    </div><div className="mt-5 rounded-xl border border-[#dce8df] bg-[#f8faf7] p-5">
      <div className="mb-2 text-xs font-bold text-[#3f8666]">OWNER-ONLY DRAFT · NOT PUBLIC</div>
      <div className="mb-2 text-xs">{draft.kind} · {draft.module||"Subject not specified"}</div>
      <h3 className="text-xl font-bold">{draft.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm">{draft.kind==="Flashcards"?draft.cards.length+" cards":draft.body||draft.alt||draft.file?.name}</p>
      <p className="mt-4 text-xs"><ShieldCheck size={14} className="mr-1 inline"/> {draft.provenance} · {draft.source}</p>
      <p className="mt-2 text-xs">Visibility: {draft.audience} · Comments: {draft.comments}</p></div>
      <p className="mt-4 text-sm text-[#78654f]">Review complete. Publishing is disabled until authenticated storage, permissions, and uploads are implemented and tested.</p>
      <button type="button" disabled className="mt-3 rounded-xl bg-[#245b4c] px-5 py-2.5 text-white opacity-50">Publish (backend not connected)</button>
    </section>}
    {tried&&problems.length>0&&<div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{problems.map(p=><p key={p}>{p}</p>)}</div>}
    <div className="mt-5 flex justify-between gap-3"><button type="button" disabled={step===0} onClick={()=>{setStep(s=>s-1);setTried(false)}} className="rounded-xl border px-5 py-2.5 disabled:opacity-40">Back</button>
      {step<3&&<button type="button" onClick={next} className="rounded-xl bg-[#245b4c] px-5 py-2.5 font-semibold text-white">Continue →</button>}</div>
  </main>;
}
