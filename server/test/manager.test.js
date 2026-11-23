import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;

const { initStore, getState, update, closeStore } = await import('../src/store.js');
const manager = await import('../src/manager.js');

await initStore();

test('officeSnapshot reflects state', () => {
  const snap = manager.officeSnapshot();
  assert.ok(Array.isArray(snap.agents) && snap.agents.length >= 1);
  assert.ok(Array.isArray(snap.tasks));
});

test('templateBriefing works without AI key', async () => {
  update(s => s.tasks.push({ id: 't1', title: 'حملة تسويق', status: 'Queued', agentId: 'marketing', updatedAt: new Date().toISOString(), output: null, logs: [] }));
  const text = await manager.managerBriefing();
  assert.match(text, /مدير/);
  assert.match(text, /حملة تسويق/);
});

test('approval detection', () => {
  assert.ok(manager.isApproval('تمام'));
  assert.ok(manager.isApproval('أيوه'));
  assert.ok(manager.isApproval('ok'));
  assert.ok(!manager.isApproval('اعمل تاسك جديد'));
});

test('pending action queue and resolve', () => {
  const a = manager.queueAction({ kind: 'create_task', title: 'اختبار' });
  assert.equal(manager.findAwaitingAction()?.id, a.id);
  const resolved = manager.resolveAction(a.id, 'approved');
  assert.equal(resolved.status, 'approved');
  assert.equal(manager.findAwaitingAction(), null);
});

test('managerReply returns null without AI key (honest failure)', async () => {
  const reply = await manager.managerReply({ message: 'عامل ايه' });
  assert.equal(reply, null);
});

await closeStore();
