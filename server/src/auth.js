import crypto from 'node:crypto';
const secret = () => process.env.AUTH_SECRET || process.env.OWNER_PASSWORD || 'local-development-only-change-me';
const b64 = value => Buffer.from(value).toString('base64url');
export function authRequired() { return Boolean(process.env.OWNER_PASSWORD); }
export function issueToken() {
  const payload = b64(JSON.stringify({ sub: 'owner', exp: Math.floor(Date.now()/1000) + 12*60*60 }));
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyToken(token='') {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest();
  let supplied; try { supplied = Buffer.from(signature, 'base64url'); } catch { return false; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return false;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString()); return data.sub === 'owner' && data.exp > Date.now()/1000; } catch { return false; }
}
export function requireOwner(req, res, next) {
  if (!authRequired()) return next();
  const token = (req.headers.authorization || '').replace(/^Bearer\\s+/i, '');
  if (!verifyToken(token)) return res.status(401).json({ error: 'Authentication required' });
  next();
}
export function passwordMatches(candidate='') {
  const expected = Buffer.from(process.env.OWNER_PASSWORD || '');
  const supplied = Buffer.from(String(candidate));
  return expected.length > 0 && expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}
