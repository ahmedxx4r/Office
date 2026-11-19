import test from 'node:test';
import assert from 'node:assert/strict';
process.env.AUTH_SECRET = 'test-secret-that-is-long-enough';
process.env.OWNER_PASSWORD = 'test-password';
const { issueToken, verifyToken, passwordMatches } = await import('../src/auth.js');
test('owner password comparison accepts only the configured password',()=>{
  assert.equal(passwordMatches('test-password'),true);
  assert.equal(passwordMatches('wrong-password'),false);
});
test('signed owner tokens verify and reject tampering',()=>{
  const token=issueToken();
  assert.equal(verifyToken(token),true);
  assert.equal(verifyToken(token+'x'),false);
  assert.equal(verifyToken(''),false);
});
