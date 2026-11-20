import crypto from 'node:crypto';
import { queryDb } from '../store.js';

const REDIRECT_PATH = '/api/integrations/instagram/callback';
const scopes = (process.env.INSTAGRAM_SCOPES || 'instagram_business_basic,instagram_business_content_publish').split(',').map(x => x.trim()).filter(Boolean);
const appId = () => process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID;
const appSecret = () => process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;
const redirectUri = () => process.env.INSTAGRAM_REDIRECT_URI || `${process.env.APP_URL || 'https://office-nexlova.vercel.app'}${REDIRECT_PATH}`;
const encryptionKey = () => crypto.createHash('sha256').update(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.OFFICE_GATE_SECRET || '').digest();

function encrypt(value) {
  const key = encryptionKey();
  if (!process.env.SOCIAL_TOKEN_ENCRYPTION_KEY && !process.env.AUTH_SECRET && !process.env.OFFICE_GATE_SECRET) throw new Error('Social token encryption is not configured.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
function decrypt(value) {
  const [iv, tag, body] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const html = (res, status, title, message) => res.status(status).type('html').send(`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font:16px system-ui;max-width:640px;margin:12vh auto;padding:24px;color:#18202a"><h2>${title}</h2><p>${String(message).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</p><p>You can close this tab and return to ISystem.</p></body></html>`);

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: appId(), client_secret: appSecret(), grant_type: 'authorization_code',
    redirect_uri: redirectUri(), code: code.replace(/#_$/, '')
  });
  const response = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_message || data.error?.message || 'Instagram authorization-code exchange failed.');
  return data;
}
async function getLongLivedToken(shortToken) {
  const url = new URL('https://graph.instagram.com/access_token');
  url.search = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: appSecret(), access_token: shortToken });
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error?.message || 'Instagram long-lived token exchange failed.');
  return data;
}
async function getProfile(token) {
  const url = new URL('https://graph.instagram.com/me');
  url.search = new URLSearchParams({ fields: 'user_id,username', access_token: token });
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !(data.user_id || data.id)) throw new Error(data.error?.message || 'Could not read the Instagram professional account.');
  return { id: String(data.user_id || data.id), username: data.username || null };
}

export function registerInstagramRoutes(app) {
  app.post('/api/integrations/instagram/connect', async (_req, res) => {
    try {
      if (!appId() || !appSecret()) return res.status(503).json({ error: 'Instagram app credentials are not configured in Vercel yet.' });
      const state = crypto.randomBytes(32).toString('base64url');
      await queryDb('INSERT INTO social_oauth_states (state_hash, platform, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')', [hash(state), 'instagram']);
      const url = new URL('https://www.instagram.com/oauth/authorize');
      url.search = new URLSearchParams({ client_id: appId(), redirect_uri: redirectUri(), response_type: 'code', scope: scopes.join(','), state });
      res.json({ authorizationUrl: url.toString(), redirectUri: redirectUri() });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.get(REDIRECT_PATH, async (req, res) => {
    try {
      if (req.query.error) return html(res, 400, 'Instagram connection cancelled', req.query.error_description || req.query.error);
      const code = String(req.query.code || '');
      const state = String(req.query.state || '');
      if (!code || !state) return html(res, 400, 'Instagram connection failed', 'The authorization response was incomplete.');
      const consumed = await queryDb('DELETE FROM social_oauth_states WHERE state_hash = $1 AND platform = $2 AND expires_at > NOW() RETURNING state_hash', [hash(state), 'instagram']);
      if (!consumed.rowCount) return html(res, 400, 'Instagram connection expired', 'Please return to ISystem and start the connection again.');
      if (!appId() || !appSecret()) return html(res, 503, 'Instagram is not configured', 'The Instagram app credentials are missing from the server configuration.');
      const shortToken = await exchangeCode(code);
      const longToken = await getLongLivedToken(shortToken.access_token);
      const profile = await getProfile(longToken.access_token);
      const expiresAt = longToken.expires_in ? new Date(Date.now() + Number(longToken.expires_in) * 1000).toISOString() : null;
      await queryDb(`INSERT INTO social_connections (id, platform, account_id, username, access_token_enc, token_expires_at, scopes, status, updated_at)
        VALUES ($1, 'instagram', $2, $3, $4, $5, $6, 'connected', NOW())
        ON CONFLICT (platform, account_id) DO UPDATE SET username=EXCLUDED.username, access_token_enc=EXCLUDED.access_token_enc, token_expires_at=EXCLUDED.token_expires_at, scopes=EXCLUDED.scopes, status='connected', updated_at=NOW()`,
        [crypto.randomUUID(), profile.id, profile.username, encrypt(longToken.access_token), expiresAt, scopes]);
      return res.redirect(302, '/?social=instagram-connected');
    } catch (error) {
      console.error('[instagram-oauth] callback failed:', error.message);
      return html(res, 502, 'Instagram connection failed', error.message);
    }
  });

  app.get('/api/integrations/instagram/status', async (_req, res) => {
    try {
      const result = await queryDb("SELECT account_id, username, token_expires_at, scopes, status, updated_at FROM social_connections WHERE platform='instagram' ORDER BY updated_at DESC LIMIT 1");
      res.json({ connected: Boolean(result.rows[0]?.status === 'connected'), account: result.rows[0] || null, redirectUri: redirectUri(), configured: Boolean(appId() && appSecret()) });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.post('/api/integrations/instagram/disconnect', async (_req, res) => {
    try {
      await queryDb("UPDATE social_connections SET status='revoked', access_token_enc='', updated_at=NOW() WHERE platform='instagram'");
      res.json({ ok: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });
}

export async function getInstagramAccessToken() {
  const result = await queryDb("SELECT access_token_enc, token_expires_at FROM social_connections WHERE platform='instagram' AND status='connected' ORDER BY updated_at DESC LIMIT 1");
  const connection = result.rows[0];
  if (!connection) throw new Error('Instagram is not connected.');
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() < Date.now() + 24 * 60 * 60 * 1000) {
    const current = decrypt(connection.access_token_enc);
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.search = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: current });
    const response = await fetch(url);
    const refreshed = await response.json();
    if (!response.ok || !refreshed.access_token) throw new Error(refreshed.error?.message || 'Instagram token refresh failed. Reconnect the account.');
    const expiresAt = new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString();
    await queryDb("UPDATE social_connections SET access_token_enc=$1, token_expires_at=$2, updated_at=NOW() WHERE platform='instagram' AND status='connected'", [encrypt(refreshed.access_token), expiresAt]);
    return refreshed.access_token;
  }
  return decrypt(connection.access_token_enc);
}
