// Copies measured clip durations from public/audio/manifest.json back into the
// storyboards so the progress bar and "about N min" label match the voice, and
// writes content/audio.json (file -> seconds) that lib/audio.ts uses to know
// which clips exist. Updates both content/modules/*.json and content/drafts/*.json
// so a later merge-drafts does not undo the timing.
//   node scripts/retime-storyboards.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry');
const MIN = 4, MAX = 40, PAD = 0.6; // seconds; PAD leaves a breath after the clip ends

const manifest = JSON.parse(readFileSync(path.join(root, 'public/audio/manifest.json'), 'utf8'));
const byKey = new Map(manifest.map(m => [`${m.storyboardId}/${m.frameId}`, m]));

const index = {};
for (const m of manifest) index[m.file] = m.durationSeconds;
if (!dry) writeFileSync(path.join(root, 'content/audio.json'), JSON.stringify(index, null, 2) + '\n');

let changed = 0, over = [];
function retime(storyboards, label) {
  for (const sb of storyboards) for (const f of sb.frames) {
    const clip = byKey.get(`${sb.id}/${f.id}`);
    if (!clip) continue;
    const want = Math.min(MAX, Math.max(MIN, Math.ceil(clip.durationSeconds + PAD)));
    if (clip.durationSeconds + PAD > MAX) over.push(`${label} ${sb.id}/${f.id} ${clip.durationSeconds}s`);
    if (f.seconds !== want) { f.seconds = want; changed++; }
  }
}

for (const dir of ['content/modules', 'content/drafts']) {
  const full = path.join(root, dir);
  if (!existsSync(full)) continue;
  for (const name of readdirSync(full).filter(n => n.endsWith('.json'))) {
    const file = path.join(full, name);
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const mod = dir.endsWith('drafts') ? data.module : data;
    if (!mod?.storyboards) continue;
    retime(mod.storyboards, `${dir}/${name}`);
    if (!dry) writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  }
}

console.log(`${changed} frame timings ${dry ? 'would change' : 'updated'}; ${Object.keys(index).length} clips indexed.`);
if (over.length) console.log(`Clips longer than ${MAX}s (progress bar will end early):\n  ${over.join('\n  ')}`);
