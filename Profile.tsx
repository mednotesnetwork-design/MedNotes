import { useState } from "react";
import { Link } from "wouter";
import {
  BookOpen, Bookmark, CheckCircle2, FileText, GraduationCap,
  Image as ImageIcon, LockKeyhole, MessageCircle, Plus, Share2,
  Users, Video, Layers, ArrowRight, Eye, BadgeCheck, UserRound,
} from "lucide-react";

type ContentKind = "Text" | "PDF" | "Image" | "Video" | "MCQ" | "Flashcards";
type Tab = "Posts" | "Files" | "MCQs" | "Flashcards" | "Media" | "Saved";

interface PreviewPost {
  id: number;
  kind: ContentKind;
  title: string;
  excerpt: string;
  subject: string;
  provenance: string;
  source: string;
  published: string;
}

const posts: PreviewPost[] = [
  { id: 1, kind: "PDF", title: "Upper limb anatomy · clinical relations", excerpt: "A structured study file covering the brachial plexus, vascular landmarks and clinical injuries.", subject: "Anatomy · MSK", provenance: "Lecture-linked", source: "MSK lecture notes · educational example", published: "2 days ago" },
  { id: 2, kind: "MCQ", title: "Why does a scaphoid fracture risk AVN?", excerpt: "Which anatomical feature explains the risk of avascular necrosis in a proximal pole fracture?", subject: "Anatomy · MSK", provenance: "Original explanation", source: "Educational practice question · example", published: "4 days ago" },
  { id: 3, kind: "Flashcards", title: "Neuromuscular junction · 12 cards", excerpt: "Recall the order of ACh release, depolarization and excitation–contraction coupling.", subject: "Physiology · MSK", provenance: "Original explanation", source: "Educational example", published: "6 days ago" },
  { id: 4, kind: "Text", title: "RANKL, RANK and OPG — the core distinction", excerpt: "Osteoblast-lineage cells regulate osteoclast formation. OPG is the soluble decoy receptor that limits RANKL signalling.", subject: "Physiology · MSK", provenance: "Textbook/guideline/article", source: "Illustrative textbook-linked post · citation required before publication", published: "1 week ago" },
  { id: 5, kind: "Image", title: "Posterior compartment of the leg", excerpt: "Anatomical orientation: superficial versus deep posterior layers.", subject: "Anatomy · MSK", provenance: "AI-assisted", source: "Illustrative image post · AI disclosure", published: "1 week ago" },
  { id: 6, kind: "Video", title: "Muscle contraction in 90 seconds", excerpt: "A short visual walkthrough from the motor end plate to cross-bridge cycling.", subject: "Physiology · MSK", provenance: "Original explanation", source: "Illustrative video post", published: "2 weeks ago" },
];

const tabNames: Tab[] = ["Posts", "Files", "MCQs", "Flashcards", "Media", "Saved"];
const kindIcons: Record<ContentKind, typeof FileText> = {
  Text: BookOpen, PDF: FileText, Image: ImageIcon,
  Video, MCQ: CheckCircle2, Flashcards: Layers,
};

function CreatorIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid shrink-0 place-items-center rounded-2xl bg-[#dcece4] text-[#1c5147] font-bold ${compact ? "h-10 w-10 text-sm" : "h-16 w-16 text-xl"}`}>MN</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`font-semibold text-[#173b35] ${compact ? "text-sm" : "text-xl"}`}>MedNote Creator</span>
          <span title="Example identity badge. Identity verification does not validate medical claims." aria-label="Identity badge example; not medical endorsement"><BadgeCheck size={compact ? 15 : 18} className="text-[#498f79]" /></span>
        </div>
        <p className="text-xs text-[#65817a]">@mednote.creator · Medical student</p>
      </div>
    </div>
  );
}

function PostCard({ post, saved, onSave }: { post: PreviewPost; saved: boolean; onSave: () => void }) {
  const Icon = kindIcons[post.kind];
  return (
    <article className="rounded-2xl border border-[#dce9e2] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CreatorIdentity compact />
        <span className="text-xs text-[#7b8f87]">{post.published}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f3ec] px-3 py-1 font-semibold text-[#306d5b]"><Icon size={13} /> {post.kind}</span>
        <span className="rounded-full bg-[#f5efe4] px-3 py-1 text-[#74644c]">{post.subject}</span>
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug text-[#173b35]">{post.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#536c65]">{post.excerpt}</p>
      {post.kind === "PDF" && <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#e2e9e5] bg-[#f5f8f5] p-4"><FileText className="text-[#3b816b]" size={27} /><div><p className="text-sm font-semibold">Lecture file preview</p><p className="text-xs text-[#70847b]">Sample metadata · No real file attached</p></div></div>}
      {post.kind === "MCQ" && <p className="mt-4 rounded-xl bg-[#f4f7f4] p-3 text-xs text-[#4d6c60]">Answer stays hidden until the learner attempts the question in Post Detail.</p>}
      {post.kind === "Flashcards" && <p className="mt-4 rounded-xl bg-[#f4f7f4] p-3 text-xs text-[#4d6c60]">Study mode reveals one card at a time.</p>}
      {post.kind === "Image" && <div className="mt-4 flex h-28 items-center justify-center gap-2 rounded-xl bg-[#edf2ed] text-sm text-[#60776b]"><ImageIcon size={18} /> Image preview placeholder</div>}
      {post.kind === "Video" && <div className="mt-4 flex h-28 items-center justify-center gap-2 rounded-xl bg-[#edf2ed] text-sm text-[#60776b]"><Video size={18} /> Video preview placeholder</div>}
      <div className="mt-4 border-t border-[#e9eee9] pt-3 text-xs text-[#667d74]">
        <span className="font-semibold text-[#386f5c]">{post.provenance}</span><span className="mx-2">·</span>{post.source}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-[#607b70]">
          <span className="inline-flex items-center gap-1"><MessageCircle size={15} /> Discuss</span>
          <button type="button" onClick={onSave} className="inline-flex items-center gap-1 hover:text-[#1e6650]" aria-pressed={saved}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved privately" : "Save"}</button>
        </div>
        <button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)} className="inline-flex items-center gap-1 text-xs text-[#607b70]" aria-label="Copy profile link"><Share2 size={15} /> Share</button>
      </div>
    </article>
  );
}

export function Profile() {
  const [tab, setTab] = useState<Tab>("Posts");
  const [following, setFollowing] = useState(false);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [viewAsOwner, setViewAsOwner] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const shown = posts.filter(post => {
    if (tab === "Saved") return viewAsOwner && savedIds.includes(post.id);
    if (tab === "Files") return post.kind === "PDF";
    if (tab === "MCQs") return post.kind === "MCQ";
    if (tab === "Flashcards") return post.kind === "Flashcards";
    if (tab === "Media") return post.kind === "Image" || post.kind === "Video";
    return true;
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 font-sans">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#537367]">
        <span className="rounded-full border border-[#b9d6c8] bg-[#e7f2eb] px-3 py-1 font-semibold">UX REVIEW CANDIDATE · SAMPLE DATA ONLY</span>
        <button type="button" onClick={() => { setViewAsOwner(v => !v); if (tab === "Saved") setTab("Posts"); }} className="rounded-full border border-[#c9dcd0] px-3 py-1.5 font-semibold">{viewAsOwner ? "Switch to visitor view" : "Switch to owner view"}</button>
      </div>
      <section className="overflow-hidden rounded-3xl border border-[#dce9e2] bg-white shadow-sm">
        <div className="relative h-36 bg-gradient-to-r from-[#183b37] via-[#316b5d] to-[#94bca8]"><div className="absolute bottom-5 right-7 text-xs tracking-[.28em] text-white/70">MEDNOTE / COMMUNITY</div></div>
        <div className="px-6 pb-6 pt-5 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><CreatorIdentity /><button type="button" onClick={() => setFollowing(v => !v)} className="rounded-xl bg-[#225b4d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#174a3e]">{following ? "Following ✓" : "+ Follow"}</button></div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#45635a]">Medical education, clear explanations, and practical study resources. Building a trustworthy academic community one resource at a time.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#3e6959]"><span className="rounded-lg bg-[#eef5ef] px-3 py-2"><GraduationCap size={13} className="mr-1 inline" /> Umm Al-Qura University</span><span className="rounded-lg bg-[#eef5ef] px-3 py-2">Medicine · Preclinical</span><span className="rounded-lg bg-[#eef5ef] px-3 py-2"><UserRound size={13} className="mr-1 inline" /> Student / Tutor / Organizer roles supported</span></div>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-[#e7eee8] pt-4 text-sm"><span><strong className="text-[#214e42]">6</strong> <span className="text-[#71867c]">Posts (sample)</span></span><span><strong className="text-[#214e42]">{following ? "129" : "128"}</strong> <span className="text-[#71867c]">Followers (sample)</span></span><span><strong className="text-[#214e42]">47</strong> <span className="text-[#71867c]">Following (sample)</span></span></div>
          <button type="button" onClick={() => setShowVerification(v => !v)} className="mt-4 inline-flex items-center gap-2 text-xs text-[#3d7963]"><BadgeCheck size={15} /> What does identity verification mean?</button>
          {showVerification && <p className="mt-2 max-w-xl rounded-xl bg-[#f3f7f4] p-3 text-xs text-[#506d60]">Verification confirms the account identity only. It does not validate individual medical claims, source quality, or professional credentials. This badge is illustrative in the preview.</p>}
        </div>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Profile content" className="mb-4 flex gap-2 overflow-x-auto pb-2">{tabNames.filter(t => viewAsOwner || t !== "Saved").map(t => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-[#245c4e] text-white" : "bg-white text-[#587568] hover:bg-[#edf5ef]"}`}>{t}{t === "Saved" && <LockKeyhole size={12} className="ml-1 inline" />}</button>)}</div>
          <div className="space-y-4">{shown.length ? shown.map(post => <PostCard key={post.id} post={post} saved={savedIds.includes(post.id)} onSave={() => setSavedIds(ids => ids.includes(post.id) ? ids.filter(id => id !== post.id) : [...ids, post.id])} />) : <div className="rounded-2xl border border-dashed border-[#b9d3c5] bg-white p-10 text-center text-sm text-[#668174]">{tab === "Saved" ? "Your private Library is empty. Save a post to see it here." : "No sample content in this category."}</div>}</div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#dce9e2] bg-white p-5"><h2 className="text-sm font-bold text-[#1e5142]">Academic identity</h2><p className="mt-3 text-sm text-[#5b7468]">University · College · Year · Batch (optional)</p><p className="mt-2 text-xs leading-5 text-[#829388]">Identity, academic role, and the provenance of each post are shown separately.</p></div>
          {viewAsOwner && <div className="rounded-2xl border border-[#dce9e2] bg-white p-5"><h2 className="text-sm font-bold text-[#1e5142]">Creator insights · private</h2><p className="mt-2 text-xs text-[#73867c]">Views · PDF opens · MCQ attempts · follower growth</p><p className="mt-3 text-xs text-[#8a9b91]">Metrics are not connected in this preview.</p></div>}
          <Link href="/upload" className="flex items-center justify-between rounded-2xl bg-[#1f5145] p-5 text-sm font-semibold text-white"><span className="inline-flex items-center gap-2"><Plus size={18} /> Existing upload flow</span><ArrowRight size={17} /></Link>
          <p className="px-2 text-xs leading-5 text-[#7a8f83]">Course and Room affiliations will appear as context on a profile. This milestone does not create or redesign Rooms.</p>
        </aside>
      </div>
    </main>
  );
}
