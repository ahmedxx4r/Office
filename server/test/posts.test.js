import test from 'node:test';
import assert from 'node:assert/strict';
process.env.BUFFER_ACCESS_TOKEN = 'test-token';
const { parseScheduleTime, toCairoString, dedupeKey, createPosts, editPost, cancelPost, publishPost, STATUS } = await import('../src/posts.js');

// ---- fake Buffer GraphQL API ----
let calls = [];
let failNextCreates = 0;
let failStatus = 500;
let deleteShouldFail = false;
let nextBufferStatus = 'scheduled';
globalThis.fetch = async (_url, options) => {
  const { query, variables } = JSON.parse(options.body);
  calls.push({ query, variables });
  const ok = data => ({ ok: true, status: 200, json: async () => ({ data }) });
  if (query.includes('DawwarBufferPublishTargets')) return ok({ account: { organizations: [{ id: 'org1', name: 'Nexlova' }] } });
  if (query.includes('DawwarBufferPublishChannels')) return ok({ channels: [
    { id: 'ch-fb', name: 'NEXLOVA FB', service: 'facebook', isDisconnected: false },
    { id: 'ch-ig', name: 'NEXLOVA IG', service: 'instagram', isDisconnected: false }] });
  if (query.includes('DawwarCreatePost')) {
    if (failNextCreates > 0) { failNextCreates -= 1; return { ok: false, status: failStatus, json: async () => ({ errors: [{ message: 'temporary failure' }] }) }; }
    return ok({ createPost: { post: { id: 'buf-' + calls.length, text: variables.input.text, status: nextBufferStatus, dueAt: variables.input.dueAt || null, externalLink: null } } });
  }
  if (query.includes('DawwarDeletePost')) {
    if (deleteShouldFail) return { ok: false, status: 500, json: async () => ({ errors: [{ message: 'delete failed' }] }) };
    return ok({ deletePost: { __typename: 'DeletePostSuccess' } });
  }
  throw new Error('Unexpected query: ' + query.slice(0, 60));
};
const reset = () => { calls = []; failNextCreates = 0; deleteShouldFail = false; nextBufferStatus = 'scheduled'; };
const futureCairo = (hours = 3) => toCairoString(new Date(Date.now() + hours * 3600 * 1000));

test('schedule times without an offset are read as Cairo time (winter +2, summer +3)', () => {
  assert.equal(parseScheduleTime('2026-11-21 21:30').toISOString(), '2026-11-21T19:30:00.000Z');
  assert.equal(parseScheduleTime('2026-07-01T12:00').toISOString(), '2026-07-01T09:00:00.000Z');
});

test('explicit offsets are respected and bad input is rejected', () => {
  assert.equal(parseScheduleTime('2026-11-21T10:00:00Z').toISOString(), '2026-11-21T10:00:00.000Z');
  assert.equal(parseScheduleTime('2026-11-21T10:00:00+05:00').toISOString(), '2026-11-21T05:00:00.000Z');
  assert.equal(parseScheduleTime('tomorrow at 9'), null);
  assert.equal(parseScheduleTime(''), null);
});

test('toCairoString round-trips', () => {
  assert.equal(toCairoString(parseScheduleTime('2026-11-21 21:30')), '2026-11-21 21:30');
});

test('dedupe key ignores spacing and case but not service', () => {
  const a = dedupeKey({ service: 'facebook', text: 'Hello   World ' });
  assert.equal(a, dedupeKey({ service: 'facebook', text: 'hello world' }));
  assert.notEqual(a, dedupeKey({ service: 'instagram', text: 'hello world' }));
});

test('Publish Now sends shareNow and stores the Buffer result', async () => {
  reset(); nextBufferStatus = 'sent';
  const [r] = await createPosts({ text: 'Publish now test 1', services: ['facebook'], mode: 'now' });
  assert.equal(r.ok, true);
  assert.equal(r.post.status, STATUS.Published);
  assert.ok(r.post.bufferPostId);
  const create = calls.find(c => c.query.includes('DawwarCreatePost'));
  assert.equal(create.variables.input.mode, 'shareNow');
});

test('Queue sends addToQueue and ends as Scheduled', async () => {
  reset();
  const [r] = await createPosts({ text: 'Queue test 1', services: ['facebook'], mode: 'queue' });
  assert.equal(r.post.status, STATUS.Scheduled);
  assert.equal(calls.find(c => c.query.includes('DawwarCreatePost')).variables.input.mode, 'addToQueue');
});

test('Schedule sends customScheduled with the UTC time converted from Cairo', async () => {
  reset();
  const [r] = await createPosts({ text: 'Schedule test 1', services: ['facebook'], mode: 'schedule', scheduledFor: '2099-11-21 21:30' });
  assert.equal(r.post.status, STATUS.Scheduled);
  const input = calls.find(c => c.query.includes('DawwarCreatePost')).variables.input;
  assert.equal(input.mode, 'customScheduled');
  assert.equal(input.dueAt, '2099-11-21T19:30:00.000Z');
});

test('past or missing schedule times are rejected before touching Buffer', async () => {
  reset();
  await assert.rejects(createPosts({ text: 'Past test', services: ['facebook'], mode: 'schedule', scheduledFor: '2020-01-01 10:00' }), /future/);
  await assert.rejects(createPosts({ text: 'Missing time', services: ['facebook'], mode: 'schedule' }), /scheduledFor/);
  assert.equal(calls.length, 0);
});

test('the same post is blocked as a duplicate unless explicitly allowed', async () => {
  reset();
  const first = await createPosts({ text: 'Duplicate test 1', services: ['facebook'], mode: 'queue' });
  assert.equal(first[0].ok, true);
  const second = await createPosts({ text: 'duplicate   TEST 1', services: ['facebook'], mode: 'queue' });
  assert.equal(second[0].ok, false);
  assert.match(second[0].error, /Duplicate/);
  const forced = await createPosts({ text: 'Duplicate test 1', services: ['facebook'], mode: 'queue', allowDuplicate: true });
  assert.equal(forced[0].ok, true);
});

test('Instagram without media is refused', async () => {
  reset();
  const [r] = await createPosts({ text: 'IG no media test', services: ['instagram'], mode: 'queue' });
  assert.equal(r.ok, false);
  assert.match(r.error, /image or video/i);
});

test('temporary Buffer errors are retried and eventually succeed', async () => {
  reset(); failNextCreates = 1; failStatus = 500;
  const [r] = await createPosts({ text: 'Retry test 1', services: ['facebook'], mode: 'queue' });
  assert.equal(r.ok, true);
  assert.equal(r.post.attempts, 2);
});

test('permanent errors are not retried and the post is marked Failed with the reason', async () => {
  reset(); failNextCreates = 5; failStatus = 400;
  const [r] = await createPosts({ text: 'Permanent failure test', services: ['facebook'], mode: 'queue' });
  assert.equal(r.ok, false);
  assert.equal(r.post.status, STATUS.Failed);
  assert.equal(r.post.attempts, 1);
  assert.match(r.post.error, /temporary failure/);
});

test('a Failed post can be retried with publish', async () => {
  reset(); failNextCreates = 1; failStatus = 400;
  const [failed] = await createPosts({ text: 'Retry later test', services: ['facebook'], mode: 'queue' });
  assert.equal(failed.post.status, STATUS.Failed);
  const retried = await publishPost(failed.post.id);
  assert.equal(retried.status, STATUS.Scheduled);
});

test('editing a scheduled post replaces it in Buffer', async () => {
  reset();
  const [r] = await createPosts({ text: 'Edit test original', services: ['facebook'], mode: 'schedule', scheduledFor: '2099-11-21 21:30' });
  const oldBufferId = r.post.bufferPostId;
  const edited = await editPost(r.post.id, { text: 'Edit test updated', scheduledFor: '2099-11-22 10:00' });
  assert.equal(edited.status, STATUS.Scheduled);
  assert.equal(edited.text, 'Edit test updated');
  assert.ok(calls.some(c => c.query.includes('DawwarDeletePost') && c.variables.input.id === oldBufferId));
  const lastCreate = calls.filter(c => c.query.includes('DawwarCreatePost')).at(-1).variables.input;
  assert.equal(lastCreate.dueAt, '2099-11-22T08:00:00.000Z');
});

test('canceling a scheduled post deletes it in Buffer; if Buffer refuses, nothing changes', async () => {
  reset();
  const [r] = await createPosts({ text: 'Cancel test 1', services: ['facebook'], mode: 'schedule', scheduledFor: '2099-11-21 21:30' });
  deleteShouldFail = true;
  await assert.rejects(cancelPost(r.post.id), /Buffer could not cancel/);
  deleteShouldFail = false;
  const canceled = await cancelPost(r.post.id);
  assert.equal(canceled.status, STATUS.Canceled);
  await assert.rejects(cancelPost(r.post.id), /cannot be canceled/);
});

test('draft posts are stored without contacting Buffer, then published later', async () => {
  reset();
  const [d] = await createPosts({ text: 'Draft test 1', services: ['facebook'], mode: 'draft' });
  assert.equal(d.post.status, STATUS.Draft);
  assert.equal(calls.length, 0);
  const published = await publishPost(d.post.id);
  assert.equal(published.status, STATUS.Scheduled);
});
