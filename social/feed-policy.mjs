/**
 * MedNote feed query reference. Server-side use only.
 * The caller MUST load the authenticated viewer, follow graph, blocks and
 * membership from trusted storage, never from the request payload.
 * Cursor signing key MUST remain server-side and be at least 32 bytes.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { canReadPost, projectPost } from './publishing-policy.mjs';

const TYPES = new Set(['Text', 'PDF', 'Image', 'Video', 'MCQ', 'Flashcards']);
const MAX_LIMIT = 30;
const MAX_QUERY = 80;
const CURSOR_TTL_MS = 24 * 60 * 60 * 1000;
const ERROR = 'Invalid feed cursor';

function normalizeOptions(options = {}) {
  const scope = options.scope === 'following' ? 'following' : 'forYou';
  const limit = Number.isInteger(options.limit) ? Math.max(1, Math.min(MAX_LIMIT, options.limit)) : 10;
  const type = TYPES.has(options.type) ? options.type : 'All';
  const subject = typeof options.subject === 'string' ? options.subject.trim().slice(0, 60).toLowerCase() : '';
  const query = typeof options.query === 'string' ? options.query.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY).toLowerCase() : '';
  const sourceFilter = options.sourceFilter === 'withSource' ? 'withSource' : 'all';
  return { scope, limit, type, subject, query, sourceFilter };
}
function canonical(obj) { return JSON.stringify(obj); }
function filterHash(filters) { return createHash('sha256').update(canonical(filters)).digest('hex'); }
function cursorKey(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('Server cursor secret must contain at least 32 bytes');
  return secret;
}
function sign(payload, secret) { return createHmac('sha256', cursorKey(secret)).update(payload).digest('base64url'); }
function encodeCursor(data, secret) {
  const payload = Buffer.from(canonical(data)).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}
function decodeCursor(value, secret, viewerId, filterFingerprint, now) {
  if (typeof value !== 'string' || value.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) throw new Error(ERROR);
  const [payload, mac] = value.split('.');
  const actual = Buffer.from(mac, 'base64url');
  const expected = Buffer.from(sign(payload, secret), 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error(ERROR);
  let decoded;
  try { decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
  catch { throw new Error(ERROR); }
  if (decoded?.v !== 1 || decoded.viewer !== viewerId || decoded.filters !== filterFingerprint ||
      !Number.isFinite(decoded.expires) || decoded.expires <= now ||
      !Number.isFinite(decoded.time) || typeof decoded.id !== 'string') throw new Error(ERROR);
  return decoded;
}
function timestamp(post) {
  const ms = Date.parse(post?.publishedAt ?? '');
  return Number.isFinite(ms) ? ms : null;
}
function beforeCursor(item, cursor) {
  return item.time < cursor.time || (item.time === cursor.time && item.id < cursor.id);
}
function sourceIndicator(card) {
  const source = String(card.source || '').trim();
  const ai = Boolean(String(card.aiDisclosure || '').trim()) || card.provenance === 'AI-assisted';
  const traceable = Boolean(source) && !/^(example|illustrative|educational example|citation required)/i.test(source);
  return {
    status: traceable ? 'source-declared' : 'source-needed',
    label: traceable ? 'Source supplied by author' : 'Source details needed',
    aiAssisted: ai,
    medicalReview: 'not-verified',
  };
}

/**
 * Server query reference; a real database MUST apply visibility predicates
 * before LIMIT/OFFSET to avoid existence leaks and poor performance.
 * Returned card data is allowlisted by projectPost, never the raw post.
 */
export function buildFeed({ viewer = null, posts = [], options = {}, secret, now = Date.now() }) {
  cursorKey(secret);
  if (!Array.isArray(posts)) throw new TypeError('posts must be an array');
  const opts = normalizeOptions(options);
  const viewerId = viewer?.id || 'anonymous';
  const fingerprint = filterHash(opts);
  const cursor = options.cursor ? decodeCursor(options.cursor, secret, viewerId, fingerprint, now) : null;
  const authorized = posts
    .filter(p => p?.status === 'published' && canReadPost(viewer, p))
    .map(p => ({ p, card: projectPost(viewer, p), time: timestamp(p), id: String(p.id ?? '') }))
    .filter(x => x.card.access === 'granted' && x.time !== null && x.id.length > 0);
  const matching = authorized.filter(({ p, card }) => {
    if (opts.scope === 'following' && !(viewer?.followingIds || []).includes(p.authorId)) return false;
    if (opts.type !== 'All' && card.type !== opts.type) return false;
    if (opts.subject && !String(card.subject || '').toLowerCase().includes(opts.subject)) return false;
    if (opts.query && ![card.title, card.excerpt, card.subject].some(s => String(s || '').toLowerCase().includes(opts.query))) return false;
    if (opts.sourceFilter === 'withSource' && sourceIndicator(card).status !== 'source-declared') return false;
    return true;
  }).sort((a, b) => b.time - a.time || (a.id === b.id ? 0 : a.id > b.id ? -1 : 1));
  const after = cursor ? matching.filter(item => beforeCursor(item, cursor)) : matching;
  const selected = after.slice(0, opts.limit);
  const items = selected.map(({ card }) => ({
    ...card,
    sourceIndicator: sourceIndicator(card),
    reason: opts.scope === 'following' ? 'From an author you follow' : 'Recent medical learning resource',
  }));
  const last = selected.at(-1);
  const nextCursor = after.length > selected.length && last ? encodeCursor({
    v: 1, viewer: viewerId, filters: fingerprint,
    time: last.time, id: last.id, expires: now + CURSOR_TTL_MS,
  }, secret) : null;
  return { items, nextCursor, hasMore: Boolean(nextCursor) };
}
