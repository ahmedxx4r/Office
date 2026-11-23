import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.WHATSAPP_APP_SECRET = 'test-secret';
process.env.WHATSAPP_TOKEN = 'token';
process.env.WHATSAPP_PHONE_NUMBER_ID = '123';
process.env.OWNER_WHATSAPP_NUMBER = '+201026306185';
delete process.env.DATABASE_URL;

const wa = await import('../src/whatsapp.js');

test('verifySignature accepts valid HMAC', () => {
  const body = Buffer.from('{"entry":[]}');
  const sig = 'sha256=' + crypto.createHmac('sha256', 'test-secret').update(body).digest('hex');
  assert.ok(wa.verifySignature(body, sig));
});

test('verifySignature rejects wrong signature and missing secret', () => {
  const body = Buffer.from('{}');
  assert.ok(!wa.verifySignature(body, 'sha256=deadbeef'));
  const saved = process.env.WHATSAPP_APP_SECRET;
  delete process.env.WHATSAPP_APP_SECRET;
  assert.ok(!wa.verifySignature(body, 'sha256=deadbeef'));
  process.env.WHATSAPP_APP_SECRET = saved;
});

test('isAllowedSender enforces owner allowlist', () => {
  assert.ok(wa.isAllowedSender('201026306185'));
  assert.ok(wa.isAllowedSender('+201026306185'));
  assert.ok(!wa.isAllowedSender('+15551234567'));
});

test('whatsappConfigured requires all env', () => {
  assert.ok(wa.whatsappConfigured());
  const saved = process.env.WHATSAPP_TOKEN;
  delete process.env.WHATSAPP_TOKEN;
  assert.ok(!wa.whatsappConfigured());
  process.env.WHATSAPP_TOKEN = saved;
});
