// Folds every draft bundle in content/drafts/ into the live content:
//   content/modules/<id>.json, data/question-bank.json (+ public copy),
//   content/misconceptions.json, content/glossary.json.
// Re-runnable: questions in a module's id block are replaced, diagnostic tags re-applied.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const draftsDir = path.join(root, 'content/drafts');
const topics = ['meal-foundations', 'theory-of-change', 'results-framework', 'kpis-measurement', 'evidence-systems', 'impact-assessment', 'learning-adaptation', 'accountability-inclusion', 'implementation-governance'];
// Question id block per topic. Q221..Q250 belonged to the retired data-quality module and stays unused.
const BLOCK_START = { 'meal-foundations': 101, 'theory-of-change': 131, 'results-framework': 161, 'kpis-measurement': 191, 'evidence-systems': 251, 'impact-assessment': 281, 'learning-adaptation': 311, 'accountability-inclusion': 341, 'implementation-governance': 371 };
const bankPath = path.join(root, 'data/question-bank.json');
const bank = JSON.parse(readFileSync(bankPath, 'utf8'));
const glossaryPath = path.join(root, 'content/glossary.json');
const glossary = JSON.parse(readFileSync(glossaryPath, 'utf8'));
const files = readdirSync(draftsDir).filter(f => f.endsWith('.json'));

let failed = false;
for (const f of files) {
  try { execFileSync(process.execPath, [path.join(root, 'scripts/validate-draft.mjs'), path.join(draftsDir, f)], { stdio: 'pipe' }); }
  catch (e) { failed = true; console.log(String(e.stdout)); }
}
if (failed) { console.error('Fix validation errors before merging.'); process.exit(1); }

const misconceptions = [];
const seenTags = new Set();
const newQuestions = new Map();
for (const f of files) {
  const draft = JSON.parse(readFileSync(path.join(draftsDir, f), 'utf8'));
  const mod = draft.module;
  writeFileSync(path.join(root, 'content/modules', `${mod.id}.json`), JSON.stringify(mod, null, 2) + '\n');
  for (const m of draft.misconceptions ?? []) {
    if (seenTags.has(m.tag)) { console.error(`Misconception tag ${m.tag} defined in more than one module.`); process.exit(1); }
    seenTags.add(m.tag);
    misconceptions.push(m);
  }
  for (const [id, tags] of Object.entries(draft.diagnosticTags ?? {})) {
    const q = bank.questions.find(x => x.id === id);
    q.pool = 'diagnostic';
    q.objectiveIds = tags.objectiveIds;
    if (tags.misconceptions && Object.keys(tags.misconceptions).length) q.misconceptions = tags.misconceptions; else delete q.misconceptions;
  }
  for (const q of draft.questions ?? []) newQuestions.set(q.id, q);
  for (const g of draft.glossaryAdditions ?? []) if (!glossary.some(x => x.term.toLowerCase() === g.term.toLowerCase())) glossary.push(g);
}

// Replace every question above Q100 whose module draft exists, keep others, sort by id.
const topicOfBlock = id => Object.keys(BLOCK_START).find(t => Number(id.slice(1)) >= BLOCK_START[t] && Number(id.slice(1)) <= BLOCK_START[t] + 29);
const draftedTopics = new Set(files.map(f => f.replace('.json', '')));
const kept = bank.questions.filter(q => topics.includes(q.topicId) && (Number(q.id.slice(1)) <= 100 || !draftedTopics.has(topicOfBlock(q.id))));
const merged = [...kept, ...newQuestions.values()].sort((a, b) => a.id.localeCompare(b.id));
for (const q of merged) if (!q.pool) q.pool = 'diagnostic';
const ordered = merged.map(q => ({ id: q.id, topicId: q.topicId, difficulty: q.difficulty, pool: q.pool, objectiveIds: q.objectiveIds ?? [], question: q.question, options: q.options, correctOptionId: q.correctOptionId, ...(q.misconceptions ? { misconceptions: q.misconceptions } : {}), explanation: q.explanation, source: q.source, reviewTip: q.reviewTip }));
bank.questions = ordered;
const bankText = JSON.stringify(bank, null, 2) + '\n';
writeFileSync(bankPath, bankText);
writeFileSync(path.join(root, 'public/question-bank.json'), bankText);
writeFileSync(path.join(root, 'content/misconceptions.json'), JSON.stringify(misconceptions, null, 2) + '\n');
writeFileSync(glossaryPath, JSON.stringify(glossary, null, 2) + '\n');
console.log(`Merged ${files.length} draft(s): ${ordered.length} questions in bank, ${misconceptions.length} misconceptions, ${glossary.length} glossary terms.`);
