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
      await pool.query(`CREATE TABLE IF NOT EXISTS office_state (id integer PRIMARY KEY CHECK (id = 1), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT NOW())`);
      const result = await pool.query('SELECT payload FROM office_state WHERE id = 1');
      if (result.rows[0]?.payload) state = { ...structuredClone(initial), ...result.rows[0].payload };
      else await pool.query('INSERT INTO office_state (id, payload) VALUES (1, $1::jsonb)', [JSON.stringify(state)]);
      console.log('[store] PostgreSQL persistence enabled');
    } catch (err) {
      pool = null;
      console.error('[store] PostgreSQL unavailable; falling back to local JSON:', err.message);
      loadJson();
    }
  } else loadJson();
  return state;
}
function loadJson() {
  try { if (fs.existsSync(file)) state = { ...structuredClone(initial), ...JSON.parse(fs.readFileSync(file, 'utf8')) }; }
  catch (e) { console.error('[store] State file could not be loaded:', e.message); }
}
export function getState() { return state; }
export function save() { persist(); }
export function update(mutator) { mutator(state); persist(); return state; }
export async function closeStore() { await persistChain; if (pool) await pool.end(); }
