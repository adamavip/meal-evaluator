// Exports every storyboard narration line as a flat list of audio clips to record.
// Output: docs/audio/narration-script.json (machine input for TTS) and
//         docs/audio/narration-script.md   (human-readable review copy).
// Re-run after any change to content/modules/*.json. Clip file names are stable:
//   audio/<moduleId>/<lessonSlug>-<frameId>.mp3   e.g. audio/results-framework/l3-2-f1.mp3
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(root, '../docs/audio');
mkdirSync(outDir, { recursive: true });

const modules = readdirSync(path.join(root, 'content/modules')).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(path.join(root, 'content/modules', f), 'utf8')))
  .sort((a, b) => a.order - b.order);

const slug = id => id.toLowerCase().replace(/\./g, '-');
const clips = [];
for (const m of modules) {
  for (const l of m.lessons) {
    const sb = m.storyboards.find(s => s.id === l.beats.explainer.storyboardId);
    if (!sb) throw new Error(`No storyboard ${l.beats.explainer.storyboardId} for ${l.id}`);
    sb.frames.forEach((fr, i) => clips.push({
      file: `audio/${m.id}/${slug(l.id)}-${fr.id}.mp3`,
      moduleId: m.id, moduleTitle: m.title,
      lessonId: l.id, lessonTitle: l.title,
      storyboardId: sb.id, frameId: fr.id, frame: i + 1, frames: sb.frames.length,
      targetSeconds: fr.seconds,
      text: fr.narration,
    }));
  }
}

const words = clips.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
const json = {
  course: 'CIMMYT MEAL Framework 2026-2030 course',
  generated: new Date().toISOString().slice(0, 10),
  naming: 'audio/<moduleId>/<lessonSlug>-<frameId>.mp3',
  totals: { modules: modules.length, lessons: clips.filter(c => c.frame === 1).length, clips: clips.length, words },
  clips,
};
writeFileSync(path.join(outDir, 'narration-script.json'), JSON.stringify(json, null, 2) + '\n');

let md = `# Narration script\n\nOne line per clip. File names are the target audio paths.\n\n`;
for (const m of modules) {
  md += `## Module ${m.order}: ${m.title} (\`${m.id}\`)\n\n`;
  for (const l of m.lessons) {
    md += `### ${l.id} ${l.title}\n\n`;
    for (const c of clips.filter(c => c.lessonId === l.id)) md += `- \`${c.file}\` (~${c.targetSeconds}s): ${c.text}\n`;
    md += '\n';
  }
}
writeFileSync(path.join(outDir, 'narration-script.md'), md);
console.log(`Wrote ${clips.length} clips, ${words} words, to ${outDir}`);
