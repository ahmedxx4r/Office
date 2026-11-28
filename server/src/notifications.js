import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateAddress(address) {
  if (net.isIP(address) === 4) {
    const [a,b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIP(address) === 6) {
    const value = address.toLowerCase();
    return value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') || value.startsWith('::ffff:127.') || value.startsWith('::ffff:10.') || value.startsWith('::ffff:192.168.');
  }
  return true;
}
async function safeWebhookTarget(raw) {
  const url = new URL(raw);
  const local = ['localhost','127.0.0.1','::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && process.env.ALLOW_LOCAL_WEBHOOKS === 'true' && url.protocol === 'http:')) throw new Error('Completion webhook must use HTTPS');
  if (local && process.env.ALLOW_LOCAL_WEBHOOKS === 'true') return url;
  if (url.username || url.password || url.hostname.endsWith('.local') || url.hostname.endsWith('.internal')) throw new Error('Blocked webhook host');
  const addresses = net.isIP(url.hostname) ? [{address:url.hostname}] : await dns.lookup(url.hostname, {all:true, verbatim:true});
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) throw new Error('Webhook host resolves to a private or reserved address');
  return url;
}
async function postWebhook(task) {
  const target = process.env.COMPLETION_WEBHOOK_URL;
  if (!target) return { skipped: true };
  const url = await safeWebhookTarget(target);
  const body = JSON.stringify({ event: 'onTaskComplete', occurredAt: new Date().toISOString(), task });
  const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': `task-complete-${task.id}` };
  if (process.env.WEBHOOK_SIGNING_SECRET) headers['X-Office-Signature'] = `sha256=${crypto.createHmac('sha256', process.env.WEBHOOK_SIGNING_SECRET).update(body).digest('hex')}`;
  let last;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(), 8000);
      const response = await fetch(url, { method:'POST', headers, body, signal:controller.signal, redirect:'error' }); clearTimeout(timer);
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      return { delivered: true, attempt: attempt+1 };
    } catch (err) { last=err; if (attempt<2) await new Promise(r=>setTimeout(r, 500 * (2**attempt))); }
  }
  throw last;
}
async function makeVoiceCall(task) {
  const { TWILIO_ACCOUNT_SID:sid, TWILIO_AUTH_TOKEN:token, TWILIO_FROM_NUMBER:from, OWNER_PHONE_NUMBER:to } = process.env;
  if (!sid || !token || !from || !to) return { skipped: true };
  const spokenTitle=String(task.title).slice(0,120).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const form = new URLSearchParams({ To:to, From:from, Twiml:`<Response><Say voice="alice">Your AI office has completed ${spokenTitle}. Please review the deliverable.</Say></Response>` });
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, { method:'POST', headers:{ Authorization:`Basic ${auth}`, 'Content-Type':'application/x-www-form-urlencoded' }, body:form });
  if (!response.ok) throw new Error(`Twilio call failed: HTTP ${response.status}`);
  return { initiated: true };
}
export async function notifyTaskComplete(task, subscriptions=[]) {
  const results = {};
  try { results.webhook = await postWebhook(task); } catch(e) { results.webhook = { error:e.message }; console.error('[notify] webhook:', e.message); }
  if (process.env.VOICE_CALL_ON_COMPLETE === 'true') {
    try { results.voice = await makeVoiceCall(task); } catch(e) { results.voice = { error:e.message }; console.error('[notify] voice:', e.message); }
  }
  if (subscriptions.length && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      const webpush = await import('web-push');
      webpush.default.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      results.push = await Promise.allSettled(subscriptions.map(s=>webpush.default.sendNotification(s, JSON.stringify({ title:'Dawwar', body:`Completed: ${task.title}`, taskId:task.id }))));
    } catch(e) { results.push = { error:e.message }; }
  }
  return results;
}
export async function graphRequest(path, method, body) {
  const token = process.env.MS_GRAPH_ACCESS_TOKEN;
  if (!token) throw new Error('Set MS_GRAPH_ACCESS_TOKEN to enable Microsoft 365 integrations');
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, { method, headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error?.message || `Microsoft Graph HTTP ${response.status}`);
  return data;
}
