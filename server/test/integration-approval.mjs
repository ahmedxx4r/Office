// Integration exercise: manager proposal -> owner approval -> task persisted (no AI key needed for approval path)
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// isolate state: start from a clean store so repeated local runs do not accumulate stale entries
const dataFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/state.json');
fs.rmSync(dataFile, { force: true });
process.env.PORT = '4123';
process.env.OFFICE_GATE_SECRET = 'localtest123';
process.env.AUTH_SECRET = 'localtest123';
await import('../src/index.js');
const { queueAction } = await import('../src/manager.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(1500);
const base = 'http://localhost:4123';
// seed a pending create_task action the way a successful manager reply would
queueAction({ kind: 'create_task', title: 'اكتب بوست عن العرض الجديد', agentId: 'marketing' });
const ownerMsg = 'تمام';
const res = await fetch(base + '/api/manager/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: ownerMsg }) });
assert.equal(res.status, 200, 'chat approval should succeed without AI key');
const body = await res.json();
assert.ok(Array.isArray(body.messages) && body.messages.length === 2, 'returns owner+manager pair');
assert.match(body.messages[1].content, /سجلت التاسك/, 'manager confirms task registration');
const state = await (await fetch(base + '/api/state')).json();
assert.ok(state.tasks.some(t => t.title.includes('اكتب بوست')), 'task persisted in state');
assert.ok(state.messages.some(m => m.agentId === 'manager' && m.content === ownerMsg), 'owner message persisted');
// second approval with no pending action -> falls through to AI -> honest 503 without key
// reject path: queue another proposal, reject it, expect explicit cancellation and no task
queueAction({ kind: 'create_task', title: 'اعمل تصميم للبوست', agentId: 'marketing' });
const resRej = await fetch(base + '/api/manager/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'لا، بلاش' }) });
assert.equal(resRej.status, 200, 'rejection handled without AI key');
const rejBody = await resRej.json();
assert.match(rejBody.messages[1].content, /ألغيت الطلب/, 'manager confirms cancellation');
const state2 = await (await fetch(base + '/api/state')).json();
assert.ok(!state2.tasks.some(t => t.title.includes('اعمل تصميم')), 'rejected task never created');
assert.ok((state2.pendingActions || []).every(a => a.status !== 'pending'), 'no pending actions left after reject');
// approval after rejection must not resurrect anything
const res3 = await fetch(base + '/api/manager/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'تمام' }) });
assert.equal(res3.status, 503, 'approval with nothing pending errors honestly without AI key');
const state3 = await (await fetch(base + '/api/state')).json();
assert.ok(!state3.tasks.some(t => t.title.includes('اعمل تصميم')), 'rejected action did not execute later');
console.log('integration approval flow: PASS');
process.exit(0);
