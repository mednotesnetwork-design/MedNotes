import test from "node:test";
import assert from "node:assert/strict";
import { resolvePublishingIdentity, canReadPost, projectPost, projectPublicShare, canComment, canSave, gradeMCQ, revealFlashcard, projectRevisions } from "./publishing-policy.mjs";

const owner = { id: "a" };
const guest = { id: "b", followingIds: [] };
const follower = { id: "c", followingIds: ["a"] };
const base = { id: "1", authorId: "a", status: "published", audience: "public", type: "Text", title: "Example", excerpt: "Example", source: "Textbook", comments: "Everyone" };
const followersPost = { ...base, audience: "followers" };
const question = { ...base, type: "MCQ", options: ["X", "Y"], correctIndex: 1, explanation: "Y" };
const flashcards = { ...base, type: "Flashcards", cards: [{ front: "Question", back: "Answer" }] };

test("publishing context requires a valid actor and active role", () => {
  assert.equal(resolvePublishingIdentity(null, { kind: "personal" }).allowed, false);
  assert.equal(resolvePublishingIdentity(owner, { kind: "personal" }).allowed, true);
  assert.equal(resolvePublishingIdentity(owner, { kind: "course", id: "1" }).allowed, false);
  assert.equal(resolvePublishingIdentity({ id: "a", memberships: [{ contextId: "1", role: "editor", status: "active" }] }, { kind: "course", id: "1" }).allowed, true);
  assert.equal(resolvePublishingIdentity({ id: "a", memberships: [{ contextId: "1", role: "tutor", status: "active" }] }, { kind: "tutor", id: "1" }).allowed, true);
});
test("audience and draft permissions", () => {
  assert.equal(canReadPost(null, base), true);
  assert.equal(canReadPost(guest, followersPost), false);
  assert.equal(canReadPost(follower, followersPost), true);
  assert.equal(canReadPost(owner, { ...base, status: "draft" }), true);
  assert.equal(canReadPost(guest, { ...base, status: "draft" }), false);
  assert.equal(canReadPost(guest, { ...base, audience: "unknown" }), false);
});
test("course visibility requires membership", () => {
  const course = { ...base, audience: "course", contextId: "m1" };
  assert.equal(canReadPost(guest, course), false);
  assert.equal(canReadPost({ id: "b", memberships: [{ contextId: "m1", status: "active" }] }, course), true);
});
test("post projection excludes answer keys and private media links", () => {
  assert.deepEqual(projectPost(guest, followersPost), { access: "restricted", message: "This resource is unavailable." });
  assert.equal(projectPost(guest, { ...question, media: { kind: "pdf", label: "2 pages", signedUrl: "internal" } }).correctIndex, undefined);
  assert.equal(projectPost(guest, question).explanation, undefined);
  assert.equal(projectPost(guest, flashcards).cardCount, 1);
  assert.equal(projectPost(guest, flashcards).cards, undefined);
  assert.equal(projectPost(guest, { ...base, media: { kind: "pdf", label: "2 pages", signedUrl: "internal" } }).media.signedUrl, undefined);
});
test("share metadata does not disclose restricted titles", () => {
  assert.equal(projectPublicShare(base).title, "Example");
  assert.notEqual(projectPublicShare(followersPost).title, "Example");
});
test("comment controls and private saves", () => {
  assert.equal(canComment(null, base), false);
  assert.equal(canComment(guest, base), true);
  assert.equal(canComment(guest, { ...base, comments: "Limited" }), false);
  assert.equal(canComment(follower, { ...base, comments: "Limited" }), true);
  assert.equal(canComment(owner, { ...base, comments: "Paused" }), false);
  assert.equal(canSave(guest, followersPost), false);
  assert.equal(canSave(follower, followersPost), true);
});
test("MCQ response only after valid attempt", () => {
  assert.equal(gradeMCQ(guest, question, -1).allowed, false);
  assert.equal(gradeMCQ(guest, question, 1).correct, true);
  assert.equal(gradeMCQ(guest, question, 0).correct, false);
  assert.equal(gradeMCQ(guest, { ...question, audience: "followers" }, 1).allowed, false);
});
test("flashcard reveal requires authorized index", () => {
  assert.equal(revealFlashcard(guest, flashcards, 0).back, "Answer");
  assert.equal(revealFlashcard(guest, flashcards, 1).allowed, false);
  assert.equal(revealFlashcard(guest, { ...flashcards, audience: "followers" }, 0).allowed, false);
});
test("revision history follows visibility", () => {
  assert.equal(projectRevisions(guest, followersPost).access, "restricted");
  assert.equal(projectRevisions(guest, { ...base, revisions: [{ date: "2026-10-18", summary: "Fixed", reason: "Correction", reviewType: "author" }] }).revisions.length, 1);
});
