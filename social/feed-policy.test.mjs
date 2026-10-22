import test from "node:test";
import assert from "node:assert/strict";
import { buildFeed } from "./feed-policy.mjs";

const key = "mednote-test-cursor-signing-key-not-for-use-outside-tests";
const post = (id, changes = {}) => ({
  id, authorId: "tutor", status: "published", audience: "public",
  type: "Text", title: "Study resource", excerpt: "Lecture summary",
  subject: "Neuro", source: "Author notes", publishedAt: "2026-10-21T00:00:00Z",
  ...changes
});
const read = (viewer, posts, options = {}) =>
  buildFeed({ viewer, posts, options, secret: key, now: Date.parse("2026-10-22T00:00:00Z") });

test("feed hides nonpublic posts from anonymous visitors", () => {
  const result = read(null, [post("public"), post("private", { audience: "followers" })]);
  assert.deepEqual(result.items.map(x => x.id), ["public"]);
});
test("feed excludes drafts and answer keys", () => {
  const result = read(null, [post("draft", { status: "draft" }),
    post("question", { type: "MCQ", options: ["A", "B"], correctIndex: 1 })]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].correctIndex, undefined);
});
test("feed cursors are bound to a viewer", () => {
  const posts = [post("a"), post("b")];
  const first = read({ id: "a" }, posts, { limit: 1 });
  assert.ok(first.nextCursor);
  assert.throws(() => read({ id: "b" }, posts, { limit: 1, cursor: first.nextCursor }), /Invalid feed cursor/);
});
