import crypto from 'node:crypto';
import { getState, update } from './store.js';
import { managerReply, managerBriefing, isApproval, findAwaitingAction, resolveAction, MANAGER_NAME } from './manager.js';

const GRAPH_VERSION = () => process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_APP_SECRET && process.env.OWNER_WHATSAPP_NUMBER);
}

function digits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function isAllowedSender(from) {
  const owner = digits(process.env.OWNER_WHATSAPP_NUMBER || '');
  if (!owner) return false;
  return digits(from) === owner || digits(from).endsWith(owner) || owner.endsWith(digits(from));
}

export function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET || '';
  if (!secret || !signatureHeader || !rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(signatureHeader));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function alreadyProcessed(id) {
  return (getState().processedWhatsAppIds || []).includes(id);
}

function markProcessed(id) {
  update(s => { s.processedWhatsAppIds = [...(s.processedWhatsAppIds || []), id].slice(-500); });
}

async function sendWhatsAppText(to, body) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.WHATSAPP_TOKEN },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: String(body).slice(0, 4000) } }),
  });
  if (!response.ok) throw new Error('WhatsApp send failed: HTTP ' + response.status + ': ' + (await response.text()).slice(0, 300));
}

async function downloadMedia(mediaId) {
  const meta = await fetch(`https://graph.facebook.com/${GRAPH_VERSION()}/${mediaId}`, {
    headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_TOKEN },
  });
  if (!meta.ok) throw new Error('WhatsApp media lookup failed: HTTP ' + meta.status);
  const { url } = await meta.json();
  const media = await fetch(url, { headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_TOKEN } });
  if (!media.ok) throw new Error('WhatsApp media download failed: HTTP ' + media.status);
  return Buffer.from(await media.arrayBuffer());
}

async function transcribeAudio(buffer, mimeType = 'audio/ogg') {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI API key is not configured for voice notes.');
  const form = new FormData();
  const ext = mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('mp4') ? 'm4a' : 'ogg';
  form.append('file', new Blob([buffer], { type: mimeType }), 'voice.' + ext);
  form.append('model', process.env.WHISPER_MODEL || 'whisper-1');
  form.append('language', 'ar');
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(base + '/audio/transcriptions', {
    method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: form,
  });
  if (!response.ok) throw new Error('Transcription failed: HTTP ' + response.status + ': ' + (await response.text()).slice(0, 300));
  const data = await response.json();
  return String(data.text || '').trim();
}

async function handleTextMessage(from, text, runTaskConfirm) {
  let reply;
  if (isApproval(text)) {
    const pending = findAwaitingAction();
    if (pending && pending.kind === 'create_task') {
      resolveAction(pending.id, 'approved');
      const task = await runTaskConfirm(pending);
      reply = task
        ? `تمام يا مدير، سجلت التاسك "${task.title}" عند ${task.agentName}. هقولك أول ما يخلص.`
        : 'حصلت مشكلة في تسجيل التاسك، جرب من التطبيق لو سمحت.';
    } else if (pending) {
      resolveAction(pending.id, 'needs_app');
      reply = 'الإجراء ده محتاج يتأكد من جوه ISystem نفسه. افتح التطبيق وهتلاقيه جاهز.';
    } else {
      reply = await managerReply({ message: text });
    }
  } else if (/ملخص|الصباح|briefing|اخبار المكتب|أخبار المكتب/i.test(text)) {
    reply = await managerBriefing();
  } else {
    reply = await managerReply({ message: text });
  }
  if (!reply) reply = 'مش قادر أرد دلوقتي، خدمة الذكاء الاصطناعي مش متظبطة. راجع إعدادات المفتاح.';
  await sendWhatsAppText(from, reply);
}

export function registerWhatsAppRoutes(app, { runTaskConfirm }) {
  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token && token === (process.env.WHATSAPP_VERIFY_TOKEN || '')) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Webhook verification failed' });
  });

  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      if (!whatsappConfigured()) return res.status(503).json({ error: 'WhatsApp integration is not configured' });
      if (!verifySignature(req.rawBody, req.headers['x-hub-signature-256'])) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      res.status(200).json({ ok: true });
      const entry = req.body?.entry?.[0];
      const message = entry?.changes?.[0]?.value?.messages?.[0];
      if (!message || !message.id) return;
      if (alreadyProcessed(message.id)) return;
      markProcessed(message.id);
      const from = message.from;
      if (!isAllowedSender(from)) return;
      if (message.type === 'text' && message.text?.body?.trim()) {
        await handleTextMessage(from, message.text.body.trim(), runTaskConfirm);
      } else if (message.type === 'audio' && message.audio?.id) {
        try {
          const buffer = await downloadMedia(message.audio.id);
          const text = await transcribeAudio(buffer, message.audio.mime_type);
          if (text) await handleTextMessage(from, text, runTaskConfirm);
        } catch (err) {
          await sendWhatsAppText(from, 'مقدرتش أسمع الفويس نوت كويس، ابعتهالي مكتوبة لو سمحت.').catch(() => {});
          console.error('[whatsapp] audio handling failed:', err.message);
        }
      }
    } catch (err) {
      console.error('[whatsapp] webhook error:', err.message);
    }
  });
}
