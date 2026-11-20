import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedAgents } from './agents.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../data/state.json');
const initial = { agents: seedAgents, tasks: [], messages: [], events: [], meetings: [], pushSubscriptions: [] };
let state = structuredClone(initial);
let pool = null;
let persistChain = Promise.resolve();

function persist() {
  const snapshot = JSON.stringify(state);
  if (pool) {
    persistChain = persistChain.then(() => pool.query(
      `INSERT INTO office_state (id, payload, updated_at) VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`, [snapshot]
    )).catch(err => console.error('[store] PostgreSQL persistence failed:', err.message));
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state, null, 2));
    fs.renameSync(temp, file);
  }
}

export async function initStore() {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = await import('pg');
      pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined, max: 10 });
      // The office_state table is provisioned separately; the runtime role intentionally has no CREATE privilege on public.
      const result = await pool.query('SELECT payload FROM office_state WHERE id = 1');
      if (result.rows[0]?.payload) state = { ...structuredClone(initial), ...result.rows[0].payload };
      else await pool.query('INSERT INTO office_state (id, payload) VALUES (1, $1::jsonb)', [JSON.stringify(state)]);
      console.log('[store] PostgreSQL persistence enabled');
    } catch (err) {
      pool = null;
      console.error('[store] PostgreSQL unavailable:', err.message);
      if (process.env.VERCEL === '1') throw new Error('ISystem requires its Supabase PostgreSQL connection in production: ' + err.message);
      loadJson();
    }
  } else loadJson();
  // Ensure every persisted employee has the current provider/model profile.
  const seedById = new Map(seedAgents.map(agent => [agent.id, agent]));
  let profilesUpdated = false;
  state.agents = (state.agents || []).map(agent => {
    const seed = seedById.get(agent.id);
    if (seed && !agent.ai) { profilesUpdated = true; return { ...seed, ...agent, ai: seed.ai }; }
    return agent;
  });
  if (profilesUpdated) persist();
  // Migrate the previous demo roster to the current six-person NEXLOVA team.
  const legacyIds = new Set(['gm','hr','trainer','research','media','funnel','builder','copy','accountant','assistant']);
  if ((state.agents || []).some(agent => legacyIds.has(agent.id))) {
    const legacyMap = { gm:'operations', hr:'operations', trainer:'operations', research:'data', media:'marketing', funnel:'marketing', builder:'developer', copy:'content', accountant:'finance', assistant:'operations' };
    const currentIds = new Set(seedAgents.map(agent => agent.id));
    const customAgents = (state.agents || []).filter(agent => !legacyIds.has(agent.id) && !currentIds.has(agent.id));
    state.tasks = (state.tasks || []).map(task => ({ ...task, agentId: legacyMap[task.agentId] || task.agentId }));
    state.messages = (state.messages || []).map(message => ({ ...message, agentId: legacyMap[message.agentId] || message.agentId }));
    const previous = new Map((state.agents || []).map(agent => [agent.id, agent]));
    state.agents = [...seedAgents.map(seed => ({ ...seed, status: previous.get(seed.id)?.status || 'idle' })), ...customAgents];
    persist();
  }
  return state;
}
function loadJson() {
  try { if (fs.existsSync(file)) state = { ...structuredClone(initial), ...JSON.parse(fs.readFileSync(file, 'utf8')) }; }
  catch (e) { console.error('[store] State file could not be loaded:', e.message); }
}
export function getState() { return state; }
export function getStoreStatus() { return { persistent: Boolean(pool), provider: pool ? 'postgresql' : 'local-json' }; }
export function save() { persist(); }
export function update(mutator) { mutator(state); persist(); return state; }
export async function closeStore() { await persistChain; if (pool) await pool.end(); }

export async function queryDb(sql, params = []) {
  if (!pool) throw new Error('Persistent PostgreSQL storage is not available.');
  return pool.query(sql, params);
}
