import { v4 as uuid } from 'uuid';
import { getState, update } from './store.js';
import { generateText } from './ai.js';

export const MANAGER_ID = 'manager';
export const MANAGER_NAME = 'مدير المكتب';

const APPROVAL_RE = /^(حلو|تمام|ممتاز|جميل|اوكي|أوكي|يلا|اتفقنا|نعم|ايوه|أيوه|آه|اه|ok|okay|yes|go ahead|confirm)([.!؟\s]*)$/i;

const MANAGER_SYSTEM = `أنت "مدير المكتب" في ISystem، منصة إدارة فريق عمل ذكاء اصطناعي تابعة لشركة NEXLOVA. بتكلم صاحب المكتب (المدير) باللهجة المصرية وبشكل مختصر وواضح، لأن ردك ممكن يتقار بصوت عالي.

القواعد:
- جاوب من حالة المكتب الحقيقية اللي بتتبعتلك بس. ممنوع تختلق أرقام أو نتايج أو اجتماعات أو عملاء.
- لما المدير يطلب ملخص، لخّص حالة كل موظف والتاسكات (قيد التنفيذ/في الانتظار/المكتملة) والاجتماعات بشكل صوتي بسيط.
- لما يطلب شغل جديد، اعتبره اقتراح تاسك: حدد الموظف المناسب من القايمة وارجعله تأكيد قصير قبل التنفيذ.
- أي إجراء خارجي (إيميل، حجز اجتماع في الكالندر، نشر سوشيال) ممنوع تقول إنه اتنفذ. قول إنه محتاج موافقة المدير من التطبيق الأول.
- لو الطلب مش واضح، اسأل سؤال واحد قصير.
- الرد يكون قصير (جملتين لأربعة)، من غير نقاط طويلة ولا رموز تعبيرية كتير.`;

export function officeSnapshot() {
  const s = getState();
  const agentName = id => (s.agents.find(a => a.id === id) || {}).name || id;
  return {
    agents: s.agents.map(a => ({ id: a.id, name: a.name, role: a.role, status: a.status })),
    tasks: s.tasks.slice(0, 25).map(t => ({
      id: t.id, title: t.title, status: t.status,
      agent: agentName(t.agentId), updatedAt: t.updatedAt,
      outputPreview: t.output ? String(t.output).slice(0, 300) : null,
    })),
    meetings: (s.meetings || []).slice(-5).map(m => ({ title: m.title, status: m.status, createdAt: m.createdAt })),
  };
}

export function findAwaitingAction() {
  const list = (getState().pendingActions || []).filter(a => a.status === 'pending');
  return list.length ? list[list.length - 1] : null;
}

export function isApproval(message = '') {
  return APPROVAL_RE.test(String(message).trim());
}

export function queueAction(action) {
  const entry = { id: uuid(), status: 'pending', createdAt: new Date().toISOString(), ...action };
  update(s => { s.pendingActions = [...(s.pendingActions || []), entry].slice(-50); });
  return entry;
}

export function resolveAction(id, status) {
  let found = null;
  update(s => {
    const item = (s.pendingActions || []).find(a => a.id === id && a.status === 'pending');
    if (item) { item.status = status; item.resolvedAt = new Date().toISOString(); found = item; }
  });
  return found;
}

export function snapshotText() {
  const snap = officeSnapshot();
  return [
    'حالة المكتب الحالية:',
    'الموظفين: ' + snap.agents.map(a => `${a.name} (${a.role}): ${a.status}`).join('، '),
    'التاسكات: ' + (snap.tasks.length
      ? snap.tasks.map(t => `- "${t.title}" عند ${t.agent} — ${t.status}${t.outputPreview ? ' — آخر نتيجة: ' + t.outputPreview : ''}`).join('\n')
      : 'مفيش تاسكات لسه'),
    'الاجتماعات: ' + (snap.meetings.length
      ? snap.meetings.map(m => `- "${m.title}" (${m.status})`).join('\n')
      : 'مفيش اجتماعات'),
  ].join('\n');
}

export async function managerReply({ message, history = [] }) {
  const recent = history.slice(-8).map(m => (m.sender === 'owner' ? 'المدير: ' : 'مدير المكتب: ') + m.content).join('\n');
  const reply = await generateText({
    system: MANAGER_SYSTEM,
    user: snapshotText() + '\n\nآخر المحادثة:\n' + (recent || '(أول رسالة)') + '\n\nالمدير: ' + message + '\n\nمدير المكتب:',
  });
  return reply ? String(reply).trim() : null;
}

export function templateBriefing() {
  const snap = officeSnapshot();
  const working = snap.agents.filter(a => a.status !== 'idle');
  const active = snap.tasks.filter(t => ['Queued', 'In Progress'].includes(t.status));
  const done = snap.tasks.filter(t => t.status === 'Completed');
  const failed = snap.tasks.filter(t => t.status === 'Failed');
  const parts = [
    'صباح الخير يا مدير.',
    working.length
      ? 'دلوقتي شغال: ' + working.map(a => a.name).join('، ') + '.'
      : 'كل الموظفين متاحين دلوقتي.',
    active.length
      ? 'عندك ' + active.length + ' تاسك شغالة: ' + active.map(t => `"${t.title}" عند ${t.agent}`).join('، ') + '.'
      : 'مفيش تاسكات في الانتظار.',
    done.length ? 'التاسكات المكتملة: ' + done.length + '.' : '',
    failed.length ? 'في ' + failed.length + ' تاسك فشلت ومحتاجة مراجعة.' : '',
    'تحب أقولك تفاصيل أي تاسك؟',
  ];
  return parts.filter(Boolean).join(' ');
}

export async function managerBriefing() {
  const reply = await generateText({
    system: MANAGER_SYSTEM + '\n\nالمطلوب: ملخص صباحي صوتي قصير (أقل من ٦ جمل) عن حالة المكتب دلوقتي.',
    user: snapshotText(),
  });
  return reply ? String(reply).trim() : templateBriefing();
}

export function makeManagerPair(message, reply) {
  const at = new Date().toISOString();
  return [
    { id: uuid(), agentId: MANAGER_ID, sender: 'owner', content: message, at },
    { id: uuid(), agentId: MANAGER_ID, sender: MANAGER_NAME, content: reply, at },
  ];
}
