// Generates one MP3 per storyboard frame through the Vercel AI Gateway speech endpoint.
//   node scripts/fetch-audio.mjs                 all clips, skips files already present
//   node scripts/fetch-audio.mjs --limit 3       first 3 clips only (probe)
//   node scripts/fetch-audio.mjs --only L3.2     one lesson
//   node scripts/fetch-audio.mjs --force         regenerate even if present
//   --model <id> --voice <name> --out <dir>      defaults below
// Input:  docs/audio/narration-script.json (from scripts/export-narration.mjs)
// Output: public/audio/<moduleId>/<lessonSlug>-<frameId>.mp3 + public/audio/manifest.json
// Key:    AI_GATEWAY_API_KEY from the environment or frontend/.env.local (never committed).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseBuffer } from 'music-metadata';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const has = name => args.includes(name);

const MODEL = flag('--model', 'microsoft/mai-voice-2.1');
const VOICE = flag('--voice', 'en-US-Harper');
const OUT = path.resolve(root, flag('--out', 'public'));
const LIMIT = Number(flag('--limit', '0'));
const ONLY = flag('--only', '');
const FORCE = has('--force');
const CONCURRENCY = Number(flag('--concurrency', '3'));
const ENDPOINT = 'https://ai-gateway.vercel.sh/v4/ai/speech-model';

function loadKey() {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  for (const f of ['.env.local', '.env']) {
    const p = path.join(root, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^AI_GATEWAY_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
    if (m) return m[1].trim();
  }
  throw new Error('AI_GATEWAY_API_KEY not found in environment or frontend/.env.local');
}
const KEY = loadKey();

// Spoken-text substitutions. The on-screen caption keeps the original; only the voice input changes.
const SAY = [
  [/\bCIMMYT'?s\b/g, "Simmit's"], [/\bCIMMYT\b/g, 'Simmit'],
  [/\bCGIAR\b/g, 'C G I A R'],
  [/\bKPIs\b/g, 'K P Is'], [/\bKPI\b/g, 'K P I'],
  [/\bUSD\s+/g, 'U S D '],
  [/\bRACI\b/g, 'RAY-see'], [/\bPRMS\b/g, 'P R M S'], [/\bKMIT\b/g, 'K M I T'], [/\bQA\b/g, 'Q A'],
];
const spoken = text => SAY.reduce((t, [re, to]) => t.replace(re, to), text);

const INSTRUCTIONS = 'Warm, clear, unhurried narrator for an internal training course. Neutral accent, medium pitch, about 145 words per minute. Natural pauses at full stops and colons. Genuine rising intonation on questions. Friendly and direct, never salesy.';

const script = JSON.parse(readFileSync(path.resolve(root, '../docs/audio/narration-script.json'), 'utf8'));
let clips = script.clips;
if (ONLY) clips = clips.filter(c => c.lessonId === ONLY || c.moduleId === ONLY);
if (LIMIT) clips = clips.slice(0, LIMIT);

const sha1 = s => createHash('sha1').update(s).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function synthesise(text, attempt = 1) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'ai-gateway-protocol-version': '0.0.1',
      'ai-speech-model-specification-version': '4',
      'ai-model-id': MODEL,
      'Content-Type': 'application/json',
    },
    // Only Google and newer OpenAI speech models honour instructions; others warn and ignore them.
    body: JSON.stringify({ text, voice: VOICE, outputFormat: 'mp3', ...(MODEL.startsWith('google/') ? { instructions: INSTRUCTIONS } : {}) }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 5) throw new Error(`${res.status} after ${attempt} attempts: ${await res.text()}`);
    const wait = Math.min(30000, 1500 * 2 ** attempt);
    console.log(`  ${res.status}, retrying in ${wait / 1000}s`);
    await sleep(wait);
    return synthesise(text, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.warnings?.length) console.log('  warnings:', JSON.stringify(json.warnings));
  return Buffer.from(json.audio, 'base64');
}

async function duration(buffer) {
  const meta = await parseBuffer(buffer, { mimeType: 'audio/mpeg' }, { duration: true });
  return Math.round((meta.format.duration ?? 0) * 100) / 100;
}

const manifestPath = path.join(OUT, 'audio/manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
const byFile = new Map(manifest.map(m => [m.file, m]));

let done = 0, skipped = 0, failed = 0, generated = 0;
const queue = [...clips];
async function worker() {
  while (queue.length) {
    const clip = queue.shift();
    const target = path.join(OUT, clip.file);
    const hash = sha1(clip.text);
    const prior = byFile.get(clip.file);
    if (!FORCE && existsSync(target) && prior?.textHash === hash && prior?.model === MODEL && prior?.voice === VOICE) { skipped++; done++; continue; }
    try {
      const buffer = await synthesise(spoken(clip.text));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, buffer);
      const seconds = await duration(buffer);
      byFile.set(clip.file, { file: clip.file, moduleId: clip.moduleId, lessonId: clip.lessonId, storyboardId: clip.storyboardId, frameId: clip.frameId, durationSeconds: seconds, targetSeconds: clip.targetSeconds, bytes: buffer.length, words: clip.text.split(/\s+/).length, model: MODEL, voice: VOICE, textHash: hash });
      generated++; done++;
      console.log(`${String(done).padStart(3)}/${clips.length} ${clip.file} ${seconds}s (target ${clip.targetSeconds}s, ${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      failed++; done++;
      console.error(`FAILED ${clip.file}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const order = new Map(script.clips.map((c, i) => [c.file, i]));
const out = [...byFile.values()].sort((a, b) => order.get(a.file) - order.get(b.file));
mkdirSync(path.dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, JSON.stringify(out, null, 2) + '\n');
const total = out.reduce((n, m) => n + m.durationSeconds, 0);
const bytes = out.reduce((n, m) => n + m.bytes, 0);
console.log(`\n${generated} generated, ${skipped} unchanged, ${failed} failed. Manifest: ${out.length} clips, ${(total / 60).toFixed(1)} min, ${(bytes / 1048576).toFixed(1)} MB. Model ${MODEL}, voice ${VOICE}.`);
if (failed) process.exit(1);
