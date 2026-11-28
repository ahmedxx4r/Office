// Decodes base64 brand assets into client/public before the Vite build.
// The binary assets are stored as .b64 text so they can be committed via the GitHub web editor.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'assets-b64');
const out = join(here, '..', 'public');
mkdirSync(out, { recursive: true });
for (const name of readdirSync(src)) {
  if (!name.endsWith('.b64')) continue;
  const data = Buffer.from(readFileSync(join(src, name), 'utf8'), 'base64');
  writeFileSync(join(out, name.slice(0, -4)), data);
  console.log('decoded', name);
}
