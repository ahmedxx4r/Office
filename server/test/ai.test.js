import test from 'node:test';
import assert from 'node:assert/strict';
process.env.OPENAI_API_KEY = '';
const { generateText, getAiMetrics, demoResponse } = await import('../src/ai.js');
test('AI adapter enters demo mode without making a network request', async () => {
  assert.equal(await generateText({ system:'test', user:'test' }), null);
  assert.equal(getAiMetrics().mode, 'demo');
});
test('demo output clearly identifies demo limitations', () => {
  const output = demoResponse({ name:'Agent One', role:'Tester' }, { title:'Test task', description:'Test brief' });
  assert.match(output, /demo mode/i);
  assert.match(output, /not an AI-generated deliverable/i);
});
