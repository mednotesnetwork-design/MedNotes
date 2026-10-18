/**
 * MedNote social publishing policy — framework-neutral reference.
 * All viewer relationships and publisher memberships MUST be loaded by the server,
 * never trusted from client-provided JSON. Not an authentication implementation.
 */
export const RESTRICTED = Object.freeze({ access: "restricted", message: "This resource is unavailable." });
const owns = (viewer, post) => Boolean(viewer?.id && viewer.id === post.authorId);
const active = (m) => m?.status === "active";
const follows = (viewer, authorId) => Boolean(viewer?.followingIds?.includes(authorId));
const courseMember = (viewer, contextId) => Boolean(contextId && viewer?.memberships?.some(m => m.contextId === contextId && active(m)));
const blocked = (viewer, post) => Boolean(viewer?.blockedAuthorIds?.includes(post.authorId) || post.blockedViewerIds?.includes(viewer?.id));

/** A role badge and academic affiliation are NEVER proof of medical review. */
export function resolvePublishingIdentity(actor, selection) {
  if (!actor?.id) return { allowed: false, reason: "sign-in-required" };
  if (selection?.kind === "personal") return { allowed: true, publisher: { kind: "personal", id: actor.id } };
  const membership = actor.memberships?.find(m => m.contextId === selection?.id && active(m));
  if (!membership) return { allowed: false, reason: "membership-required" };
  if (selection.kind === "tutor" && membership.role === "tutor")
    return { allowed: true, publisher: { kind: "tutor", id: selection.id } };
  if (selection.kind === "course" && ["organizer", "editor"].includes(membership.role))
    return { allowed: true, publisher: { kind: "course", id: selection.id } };
  return { allowed: false, reason: "role-not-authorized" };
}

export function canReadPost(viewer, post) {
  if (!post || post.status === "deleted" || blocked(viewer, post)) return false;
  if (owns(viewer, post)) return true;
  if (post.status !== "published") return false;
  if (post.audience === "public") return true;
  if (post.audience === "followers") return follows(viewer, post.authorId);
  if (post.audience === "course") return courseMember(viewer, post.contextId);
  return false; // fail closed on unrecognized audience
}

export function projectPost(viewer, post) {
  if (!canReadPost(viewer, post)) return { ...RESTRICTED };
  const { id, authorId, type, title, excerpt, subject, publishedAt, audience,
    provenance, source, aiDisclosure, publisher, correctionNotice } = post;
  // Never include MCQ answer keys, flashcard backs, private drafts or signed media URLs.
  return { access: "granted", id, authorId, type, title, excerpt, subject,
    publishedAt, audience, provenance, source, aiDisclosure, publisher,
    correctionNotice, media: post.media ? { kind: post.media.kind, label: post.media.label } : null,
    ...(type === "MCQ" ? { question: post.question, options: [...(post.options || [])] } : {}),
    ...(type === "Flashcards" ? { cardCount: post.cards?.length || 0 } : {}) };
}

export function projectPublicShare(post) {
  if (!post || post.status !== "published" || post.audience !== "public")
    return { title: "MedNote · Restricted learning resource", description: "Sign in to check access.", image: null };
  return { title: post.title, description: post.excerpt || "", image: post.publicPreviewImage || null };
}

export function canComment(viewer, post) {
  if (!viewer?.id || !canReadPost(viewer, post) || post.status !== "published") return false;
  const mode = post.comments || "Off";
  if (mode === "Everyone") return true;
  if (mode === "Limited") return owns(viewer, post) || follows(viewer, post.authorId);
  return false; // Paused and Off both disallow writes; display differs
}

export function canSave(viewer, post) {
  return Boolean(viewer?.id && canReadPost(viewer, post) && post.status === "published");
}

export function gradeMCQ(viewer, post, selectedIndex) {
  if (!canReadPost(viewer, post) || post.type !== "MCQ" || post.status !== "published")
    return { allowed: false };
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= post.options.length)
    return { allowed: false };
  return { allowed: true, correct: selectedIndex === post.correctIndex,
    correctIndex: post.correctIndex, explanation: post.explanation || "" };
}

export function revealFlashcard(viewer, post, index) {
  if (!canReadPost(viewer, post) || post.type !== "Flashcards" || post.status !== "published"
      || !Number.isInteger(index) || index < 0 || index >= (post.cards?.length || 0))
    return { allowed: false };
  return { allowed: true, back: post.cards[index].back };
}

export function projectRevisions(viewer, post) {
  if (!canReadPost(viewer, post)) return { ...RESTRICTED };
  return { access: "granted", revisions: (post.revisions || []).map(r => ({
    date: r.date, summary: r.summary, reason: r.reason, reviewType: r.reviewType
  })) };
}
