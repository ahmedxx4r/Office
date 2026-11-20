import { createHash } from 'node:crypto';
import { v4 as uuid } from 'uuid';
import { getState, update } from './store.js';
import { publishBufferPost, deleteBufferPost, getBufferPost } from './integrations/buffer.js';

export const TIMEZONE = 'Africa/Cairo';
export const STATUS = Object.freeze({
  Draft: 'Draft',
  Scheduled: 'Scheduled',
  Publishing: 'Publishing',
  Published: 'Published',
  Failed: 'Failed',
  Canceled: 'Canceled'
});

const MODES = { now: 'shareNow', schedule: 'customScheduled', queue: 'addToQueue' };
const SERVICES = ['facebook', 'instagram'];
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MIN_LEAD_MS = 60 * 1000;
const STALE_PUBLISHING_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const MAX_TEXT = 2200;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const nowIso = () => new Date().toISOString();

/* ---------- Egypt time ---------- */

function cairoParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type).value);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') };
}

function zoneOffsetMs(utcMs) {
  const p = cairoParts(new Date(utcMs));
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(utcMs / 1000) * 1000;
}

/** "2026-11-21 21:30" (no offset) is read as Cairo time. Strings with Z or an offset are respected. */
export function parseScheduleTime(input) {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  const localAsUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  let utc = localAsUtc - zoneOffsetMs(localAsUtc);
  utc = localAsUtc - zoneOffsetMs(utc);
  return new Date(utc);
}

export function toCairoString(date) {
  const p = cairoParts(new Date(date));
  const two = n => String(n).padStart(2, '0');
  return `${p.y}-${two(p.mo)}-${two(p.d)} ${two(p.h)}:${two(p.mi)}`;
}

/* ---------- Dedupe ---------- */

const normalizeText = text => String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();

export function dedupeKey({ service, text, assetUrl }) {
  return createHash('sha256').update(`${service}|${normalizeText(text)}|${assetUrl || ''}`).digest('hex');
}

function findDuplicate(key, excludeId) {
  const cutoff = Date.now() - DEDUPE_WINDOW_MS;
  return (getState().posts || []).find(p =>
    p.id !== excludeId && p.dedupeKey === key &&
    [STATUS.Scheduled, STATUS.Publishing, STATUS.Published].includes(p.status) &&
    new Date(p.createdAt).getTime() >= cutoff);
}

/* ---------- Helpers ---------- */

const list = () => getState().posts || [];
const find = id => list().find(p => p.id === id);
const log = (post, message) => { (post.logs ||= []).push({ at: nowIso(), message }); post.updatedAt = nowIso(); };

function validateAssetUrl(assetUrl) {
  if (!assetUrl) return null;
  try {
    const url = new URL(assetUrl);
    if (url.protocol !== 'https:') return 'Media URL must be a public https link.';
  } catch { return 'Media URL is not a valid link.'; }
  return null;
}

function mapBufferStatus(bufferStatus, bufferMode) {
  const s = String(bufferStatus || '').toLowerCase();
  if (s === 'sent') return STATUS.Published;
  if (s === 'error') return STATUS.Failed;
  return bufferMode === 'shareNow' ? STATUS.Publishing : STATUS.Scheduled;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/* ---------- Core operations ---------- */

/** Sends one stored post to Buffer, with retry on temporary Buffer/network errors. */
async function submit(id) {
  const initial = find(id);
  if (!initial) throw httpError(404, 'Post not found');
  const stale = initial.status === STATUS.Publishing && Date.now() - new Date(initial.updatedAt).getTime() > STALE_PUBLISHING_MS;
  if (initial.status === STATUS.Publishing && !stale) throw httpError(409, 'This post is already being published.');
  if ([STATUS.Published, STATUS.Canceled].includes(initial.status)) throw httpError(409, `A ${initial.status} post cannot be sent again.`);
  if (initial.status === STATUS.Scheduled && initial.bufferPostId) throw httpError(409, 'This post is already scheduled.');

  const snapshot = { service: initial.service, text: initial.text, assetUrl: initial.assetUrl, mode: MODES[initial.mode], dueAt: initial.scheduledFor };
  update(s => { const p = s.posts.find(x => x.id === id); p.status = STATUS.Publishing; p.error = null; log(p, 'Sending to Buffer'); });

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    update(s => { s.posts.find(x => x.id === id).attempts = attempt; });
    try {
      const result = await publishBufferPost(snapshot);
      const status = mapBufferStatus(result.status, snapshot.mode);
      update(s => {
        const p = s.posts.find(x => x.id === id);
        Object.assign(p, {
          status, bufferPostId: result.id, bufferStatus: result.status || null, channel: result.channel,
          dueAt: result.dueAt || p.scheduledFor || null, externalLink: result.externalLink || null, error: null,
          publishedAt: status === STATUS.Published ? nowIso() : null
        });
        log(p, `Buffer accepted the post (${result.status || 'ok'})`);
      });
      return find(id);
    } catch (error) {
      lastError = error;
      update(s => log(s.posts.find(x => x.id === id), `Attempt ${attempt} failed: ${error.message}`));
      if (!error.retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(1000 * attempt * attempt);
    }
  }
  update(s => { const p = s.posts.find(x => x.id === id); p.status = STATUS.Failed; p.error = lastError.message; log(p, 'Post failed'); });
  return find(id);
}

/**
 * Creates one post per service and sends it unless mode is "draft".
 * mode: now | schedule | queue | draft
 */
export async function createPosts({ text, services = SERVICES, mode = 'queue', scheduledFor, assetUrl, allowDuplicate = false, source = 'api' } = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText) throw httpError(400, 'Post text is required.');
  if (cleanText.length > MAX_TEXT) throw httpError(400, `Post text is longer than ${MAX_TEXT} characters.`);
  if (!Array.isArray(services) || !services.length || services.some(s => !SERVICES.includes(s))) throw httpError(400, 'services must be facebook and/or instagram.');
  if (mode !== 'draft' && !MODES[mode]) throw httpError(400, 'mode must be now, schedule, queue or draft.');
  const assetError = validateAssetUrl(assetUrl);
  if (assetError) throw httpError(400, assetError);

  let when = null;
  if (mode === 'schedule' || (mode === 'draft' && scheduledFor)) {
    when = parseScheduleTime(scheduledFor);
    if (!when) throw httpError(400, 'scheduledFor must look like 2026-11-21 21:30 (Cairo time) or an ISO time with an offset.');
    if (mode === 'schedule' && when.getTime() < Date.now() + MIN_LEAD_MS) throw httpError(400, 'scheduledFor must be at least one minute in the future.');
  }

  const posts = services.map(service => {
    const key = dedupeKey({ service, text: cleanText, assetUrl });
    return {
      id: uuid(), service, text: cleanText, assetUrl: assetUrl || null, mode, scheduledFor: when ? when.toISOString() : null,
      timezone: TIMEZONE, status: STATUS.Draft, dedupeKey: key, source, attempts: 0, bufferPostId: null, bufferStatus: null,
      channel: null, dueAt: null, externalLink: null, publishedAt: null, error: null,
      createdAt: nowIso(), updatedAt: nowIso(), logs: [{ at: nowIso(), message: 'Post created' }]
    };
  });

  const results = [];
  const accepted = [];
  for (const post of posts) {
    const duplicate = mode !== 'draft' && !allowDuplicate ? findDuplicate(post.dedupeKey) : null;
    if (duplicate) results.push({ ok: false, service: post.service, duplicateOf: duplicate.id, error: 'Duplicate: the same post was already sent in the last 24 hours.' });
    else accepted.push(post);
  }
  if (accepted.length) update(s => { s.posts ||= []; s.posts.unshift(...accepted); });
  for (const post of accepted) {
    if (mode === 'draft') { results.push({ ok: true, service: post.service, post }); continue; }
    const done = await submit(post.id);
    results.push({ ok: done.status !== STATUS.Failed, service: post.service, post: done, ...(done.status === STATUS.Failed ? { error: done.error } : {}) });
  }
  return results;
}

export async function editPost(id, changes = {}) {
  const post = find(id);
  if (!post) throw httpError(404, 'Post not found');
  if (![STATUS.Draft, STATUS.Scheduled, STATUS.Failed].includes(post.status)) throw httpError(409, `A ${post.status} post cannot be edited.`);

  const next = { text: post.text, assetUrl: post.assetUrl, mode: post.mode, scheduledFor: post.scheduledFor };
  if (changes.text !== undefined) next.text = String(changes.text || '').trim();
  if (changes.assetUrl !== undefined) next.assetUrl = changes.assetUrl || null;
  if (changes.mode !== undefined) next.mode = changes.mode;
  if (changes.scheduledFor !== undefined) {
    const when = parseScheduleTime(changes.scheduledFor);
    if (!when) throw httpError(400, 'scheduledFor must look like 2026-11-21 21:30 (Cairo time) or an ISO time with an offset.');
    next.scheduledFor = when.toISOString();
  }
  if (!next.text) throw httpError(400, 'Post text is required.');
  if (next.text.length > MAX_TEXT) throw httpError(400, `Post text is longer than ${MAX_TEXT} characters.`);
  if (next.mode !== 'draft' && !MODES[next.mode]) throw httpError(400, 'mode must be now, schedule, queue or draft.');
  const assetError = validateAssetUrl(next.assetUrl);
  if (assetError) throw httpError(400, assetError);
  if (post.service === 'instagram' && next.mode !== 'draft' && !next.assetUrl) throw httpError(400, 'Instagram requires a public image or video URL.');
  if (next.mode === 'schedule' && (!next.scheduledFor || new Date(next.scheduledFor).getTime() < Date.now() + MIN_LEAD_MS)) throw httpError(400, 'scheduledFor must be at least one minute in the future.');

  // A post already inside Buffer must be removed there first; if that fails nothing changes.
  const wasScheduled = post.status === STATUS.Scheduled && post.bufferPostId;
  if (wasScheduled) {
    try { await deleteBufferPost(post.bufferPostId); }
    catch (error) { throw httpError(502, 'Buffer could not remove the old scheduled post: ' + error.message); }
  }

  update(s => {
    const p = s.posts.find(x => x.id === id);
    Object.assign(p, next, {
      dedupeKey: dedupeKey({ service: p.service, text: next.text, assetUrl: next.assetUrl }),
      bufferPostId: null, bufferStatus: null, dueAt: null, externalLink: null, error: null,
      status: p.status === STATUS.Failed ? STATUS.Failed : STATUS.Draft
    });
    log(p, 'Post edited');
  });

  if (wasScheduled && next.mode !== 'draft') return submit(id);
  return find(id);
}

export async function publishPost(id) {
  const post = find(id);
  if (!post) throw httpError(404, 'Post not found');
  if (post.mode === 'draft') {
    update(s => { const p = s.posts.find(x => x.id === id); p.mode = p.scheduledFor ? 'schedule' : 'queue'; });
  }
  const current = find(id);
  if (current.mode === 'schedule' && (!current.scheduledFor || new Date(current.scheduledFor).getTime() < Date.now() + MIN_LEAD_MS)) {
    throw httpError(400, 'The scheduled time has passed. Edit the post with a new scheduledFor first.');
  }
  const duplicate = findDuplicate(current.dedupeKey, id);
  if (duplicate) throw httpError(409, 'Duplicate: the same post was already sent in the last 24 hours.');
  return submit(id);
}

export async function cancelPost(id) {
  const post = find(id);
  if (!post) throw httpError(404, 'Post not found');
  if ([STATUS.Published, STATUS.Canceled].includes(post.status)) throw httpError(409, `A ${post.status} post cannot be canceled.`);
  if (post.status === STATUS.Publishing) throw httpError(409, 'The post is being published right now.');
  if (post.bufferPostId) {
    try { await deleteBufferPost(post.bufferPostId); }
    catch (error) { throw httpError(502, 'Buffer could not cancel the post: ' + error.message); }
  }
  update(s => { const p = s.posts.find(x => x.id === id); p.status = STATUS.Canceled; log(p, 'Post canceled'); });
  return find(id);
}

/** Pulls the latest status/link from Buffer (e.g. a scheduled post that has since been sent). */
export async function syncPost(id) {
  const post = find(id);
  if (!post) throw httpError(404, 'Post not found');
  if (!post.bufferPostId) return post;
  const remote = await getBufferPost(post.bufferPostId);
  if (!remote) throw httpError(502, 'Buffer returned no data for this post.');
  update(s => {
    const p = s.posts.find(x => x.id === id);
    const status = mapBufferStatus(remote.status, MODES[p.mode]);
    p.bufferStatus = remote.status || p.bufferStatus;
    p.dueAt = remote.dueAt || p.dueAt;
    p.externalLink = remote.externalLink || p.externalLink;
    if (status === STATUS.Published && p.status !== STATUS.Published) { p.status = STATUS.Published; p.publishedAt = nowIso(); }
    else if (status === STATUS.Failed) { p.status = STATUS.Failed; p.error = 'Buffer reported an error while publishing.'; }
    log(p, 'Synced with Buffer');
  });
  return find(id);
}

/** Used by the chat flow so that Omar publishes through the same service. */
export async function publishFromChat({ text, message = '', assetUrl }) {
  const wantsFacebook = /فيسبوك|facebook/i.test(message);
  const wantsInstagram = /انستجرام|انستغرام|instagram/i.test(message);
  const services = wantsFacebook && !wantsInstagram ? ['facebook'] : wantsInstagram && !wantsFacebook ? ['instagram'] : SERVICES;
  const mode = /دلوقتي|حالاً|حالا|\bnow\b/i.test(message) ? 'now' : 'queue';
  try {
    const results = await createPosts({ text, services, mode, assetUrl, source: 'chat' });
    return results.map(r => r.ok ? { service: r.service, ok: true, post: r.post } : { service: r.service, ok: false, error: r.error });
  } catch (error) {
    return services.map(service => ({ service, ok: false, error: error.message }));
  }
}

/* ---------- Routes ---------- */

export function registerPostRoutes(app, { emit = () => {} } = {}) {
  const handle = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (error) { res.status(error.status || 500).json({ error: error.message }); }
  };

  app.get('/api/posts', (req, res) => {
    const { status, service } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const posts = list()
      .filter(p => (!status || p.status === status) && (!service || p.service === service))
      .slice(0, limit);
    res.json({ timezone: TIMEZONE, posts });
  });

  app.get('/api/posts/upcoming', (_req, res) => {
    const upcoming = list()
      .filter(p => p.status === STATUS.Scheduled)
      .sort((a, b) => new Date(a.dueAt || a.scheduledFor || 0) - new Date(b.dueAt || b.scheduledFor || 0))
      .map(p => ({ ...p, dueAtCairo: p.dueAt || p.scheduledFor ? toCairoString(p.dueAt || p.scheduledFor) : null }));
    res.json({ timezone: TIMEZONE, posts: upcoming });
  });

  app.post('/api/posts', handle(async (req, res) => {
    const results = await createPosts({ ...(req.body || {}), source: 'api' });
    emit('post:created', { postIds: results.filter(r => r.post).map(r => r.post.id) });
    const anyOk = results.some(r => r.ok);
    res.status(anyOk ? 201 : 422).json({ results });
  }));

  app.patch('/api/posts/:id', handle(async (req, res) => {
    const post = await editPost(req.params.id, req.body || {});
    emit('post:updated', { postId: post.id });
    res.json(post);
  }));

  app.post('/api/posts/:id/publish', handle(async (req, res) => {
    const post = await publishPost(req.params.id);
    emit('post:updated', { postId: post.id });
    res.json(post);
  }));

  app.post('/api/posts/:id/cancel', handle(async (req, res) => {
    const post = await cancelPost(req.params.id);
    emit('post:canceled', { postId: post.id });
    res.json(post);
  }));

  app.post('/api/posts/:id/sync', handle(async (req, res) => {
    const post = await syncPost(req.params.id);
    emit('post:updated', { postId: post.id });
    res.json(post);
  }));
}