// Validates one module draft bundle in content/drafts/<topicId>.json.
// Usage: node scripts/validate-draft.mjs content/drafts/results-framework.json
// Exit code 1 on errors. Warnings do not fail.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/validate-draft.mjs <draft.json>'); process.exit(2); }

const draft = JSON.parse(readFileSync(file, 'utf8'));
const bank = JSON.parse(readFileSync(path.join(root, 'data/question-bank.json'), 'utf8'));
const glossary = JSON.parse(readFileSync(path.join(root, 'content/glossary.json'), 'utf8'));
const topics = ['meal-foundations', 'theory-of-change', 'results-framework', 'kpis-measurement', 'evidence-systems', 'impact-assessment', 'learning-adaptation', 'accountability-inclusion', 'implementation-governance'];
// Question id block per topic. Q221..Q250 belonged to the retired data-quality module and stays unused.
const BLOCK_START = { 'meal-foundations': 101, 'theory-of-change': 131, 'results-framework': 161, 'kpis-measurement': 191, 'evidence-systems': 251, 'impact-assessment': 281, 'learning-adaptation': 311, 'accountability-inclusion': 341, 'implementation-governance': 371 };
const SECTIONS = new Set(['1', '1.1', '1.2', '1.3', '2', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '3', '3.1', '3.2', '3.3', '4', '4.1', '4.2', '4.3', '5', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.10', '6', '6.1', '6.2', 'Annex A']);
const SCENES = {
  title: ['title'], cards: ['items'], chain: ['steps'], stack: ['layers'], sort: ['bins', 'cards'], split: ['left', 'right'], dial: ['segments', 'value'], fan: ['source', 'branches', 'target'], compass: ['directions'], grid: ['rows', 'cols'], loop: ['steps'], counter: ['items'], dissolve: ['from', 'to'], checklist: ['items'],
};
const WIDGETS = { sorter: ['prompt', 'bins', 'cards'], order: ['prompt', 'items', 'why'], branch: ['prompt', 'start', 'nodes'], dial: ['prompt', 'dimensions'], matrix: ['prompt'], budget: ['prompt'], persona: ['prompt'] };
const PERSONAS = new Set(['project-lead', 'field-officer', 'scientist', 'meal-specialist', 'partner-liaison']);
const BLOOM = new Set(['remember', 'understand', 'apply', 'analyse']);

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const mod = draft.module;
if (!mod) { err('draft.module missing'); report(); }
const topicIndex = topics.indexOf(mod.id);
const isOrientation = mod.id === 'orientation';
if (topicIndex < 0 && !isOrientation) err(`module.id ${mod.id} is not a topic id`);
const expectedOrder = isOrientation ? 0 : topicIndex + 1;
if (mod.order !== expectedOrder) err(`module.order should be ${expectedOrder}`);
for (const key of ['title', 'short', 'minutes', 'sections', 'scenario', 'objectives', 'lessons', 'storyboards', 'prerequisites', 'assessed']) if (mod[key] === undefined) err(`module.${key} missing`);
if (typeof mod.minutes !== 'number' || mod.minutes < 10 || mod.minutes > 45) warn(`module.minutes ${mod.minutes} outside 10..45`);
for (const s of mod.sections ?? []) if (!SECTIONS.has(s)) err(`module.sections has invalid section ${s}`);
if (mod.scenario) {
  if (!mod.scenario.title || !mod.scenario.intro || mod.scenario.intro.length < 120) err('scenario needs a title and an intro of at least 120 characters');
  for (const p of mod.scenario.persona ?? []) if (!PERSONAS.has(p)) err(`unknown persona ${p}`);
}
for (const p of mod.prerequisites ?? []) if (!topics.includes(p)) err(`prerequisite ${p} is not a topic id`);

const objectiveIds = new Set();
(mod.objectives ?? []).forEach((o, i) => {
  if (o.id !== `${mod.id}.O${i + 1}`) err(`objective ${i + 1} id should be ${mod.id}.O${i + 1}`);
  if (!o.text || o.text.length < 20) err(`objective ${o.id} text too short`);
  if (!BLOOM.has(o.bloom)) err(`objective ${o.id} bloom invalid`);
  objectiveIds.add(o.id);
});
if (!isOrientation && (objectiveIds.size < 4 || objectiveIds.size > 6)) err(`module needs 4 to 6 objectives, has ${objectiveIds.size}`);

const storyboardIds = new Set();
for (const sb of mod.storyboards ?? []) {
  if (!sb.id || !sb.title || !Array.isArray(sb.frames) || sb.frames.length < 2) err(`storyboard ${sb.id} needs id, title and at least 2 frames`);
  if (storyboardIds.has(sb.id)) err(`duplicate storyboard id ${sb.id}`);
  storyboardIds.add(sb.id);
  const frameIds = new Set();
  for (const f of sb.frames ?? []) {
    if (!f.id || frameIds.has(f.id)) err(`storyboard ${sb.id}: frame id missing or duplicate (${f.id})`);
    frameIds.add(f.id);
    if (typeof f.seconds !== 'number' || f.seconds < 4 || f.seconds > 40) err(`storyboard ${sb.id} frame ${f.id}: seconds must be 4..40`);
    if (!f.narration || f.narration.length < 20) err(`storyboard ${sb.id} frame ${f.id}: narration too short`);
    if (/—/.test(f.narration ?? '')) warn(`storyboard ${sb.id} frame ${f.id}: narration contains an em dash`);
    const scene = f.scene;
    if (!scene || !SCENES[scene.kind]) { err(`storyboard ${sb.id} frame ${f.id}: unknown scene kind ${scene?.kind}`); continue; }
    for (const req of SCENES[scene.kind]) if (scene[req] === undefined) err(`storyboard ${sb.id} frame ${f.id}: scene.${req} required for ${scene.kind}`);
    if (scene.kind === 'sort') for (const c of scene.cards) { if (c.bin < 0 || c.bin >= scene.bins.length) err(`${sb.id}/${f.id}: card bin out of range`); if (c.wrong !== undefined && (c.wrong < 0 || c.wrong >= scene.bins.length || c.wrong === c.bin)) err(`${sb.id}/${f.id}: card wrong bin invalid`); }
    if (scene.kind === 'chain' && scene.links && scene.links.length !== scene.steps.length - 1) err(`${sb.id}/${f.id}: chain.links must have steps.length - 1 entries`);
    if (scene.kind === 'dial' && (scene.value < 0 || scene.value > 1)) err(`${sb.id}/${f.id}: dial.value must be 0..1`);
    if (scene.kind === 'compass' && scene.directions.length !== 4) err(`${sb.id}/${f.id}: compass needs exactly 4 directions`);
    if (scene.kind === 'grid' && scene.cells && (scene.cells.length !== scene.rows.length || scene.cells.some(r => r.length !== scene.cols.length))) err(`${sb.id}/${f.id}: grid.cells shape must match rows x cols`);
    if (scene.kind === 'chain' && (scene.steps.length < 2 || scene.steps.length > 6)) err(`${sb.id}/${f.id}: chain needs 2..6 steps`);
    if (scene.kind === 'stack' && (scene.layers.length < 2 || scene.layers.length > 6)) err(`${sb.id}/${f.id}: stack needs 2..6 layers`);
    if (scene.kind === 'cards' && scene.items.length > 8) err(`${sb.id}/${f.id}: cards supports up to 8 items`);
  }
}

const lessonIds = new Set();
const draftQuestions = draft.questions ?? [];
const questionById = new Map([...bank.questions, ...draftQuestions].map(q => [q.id, q]));
const glossaryTerms = new Set([...glossary, ...(draft.glossaryAdditions ?? [])].map(g => g.term.toLowerCase()));
const prefix = isOrientation ? 'L0.' : `L${topicIndex + 1}.`;
(mod.lessons ?? []).forEach((l, i) => {
  if (l.id !== `${prefix}${i + 1}`) err(`lesson ${i + 1} id should be ${prefix}${i + 1}`);
  lessonIds.add(l.id);
  if (l.moduleId !== mod.id) err(`lesson ${l.id} moduleId mismatch`);
  if (!l.title) err(`lesson ${l.id} title missing`);
  if (typeof l.minutes !== 'number' || l.minutes < 2 || l.minutes > 7) err(`lesson ${l.id} minutes must be 2..7`);
  if (!Array.isArray(l.objectiveIds) || (!isOrientation && l.objectiveIds.length === 0)) err(`lesson ${l.id} needs objectiveIds`);
  for (const o of l.objectiveIds ?? []) if (!objectiveIds.has(o)) err(`lesson ${l.id} objective ${o} not in module`);
  const b = l.beats ?? {};
  if (!b.hook || b.hook.length < 40) err(`lesson ${l.id} hook too short`);
  if (!b.explainer || !['storyboard', 'video'].includes(b.explainer.kind) || !storyboardIds.has(b.explainer.storyboardId)) err(`lesson ${l.id} explainer must reference a storyboard in this module`);
  const ex = b.example ?? {};
  if (ex.kind === 'text') { if (!ex.title || !Array.isArray(ex.body) || ex.body.length < 2) err(`lesson ${l.id} text example needs title and at least 2 body paragraphs`); }
  else if (ex.kind === 'interactive') {
    if (!WIDGETS[ex.widget]) err(`lesson ${l.id} unknown widget ${ex.widget}`);
    else for (const req of WIDGETS[ex.widget]) if (ex[req] === undefined) err(`lesson ${l.id} widget ${ex.widget} needs ${req}`);
    if (!ex.title) err(`lesson ${l.id} interactive example needs a title`);
    if (ex.widget === 'sorter') { const binIds = new Set(ex.bins.map(x => x.id)); for (const c of ex.cards) { if (!binIds.has(c.bin)) err(`lesson ${l.id} sorter card "${c.label}" bin ${c.bin} unknown`); if (!c.why) err(`lesson ${l.id} sorter card "${c.label}" needs why`); } if (ex.cards.length < 4) err(`lesson ${l.id} sorter needs at least 4 cards`); }
    if (ex.widget === 'order' && ex.items.length < 3) err(`lesson ${l.id} order widget needs at least 3 items`);
    if (ex.widget === 'branch') { if (!ex.nodes[ex.start]) err(`lesson ${l.id} branch start node missing`); for (const [id, n] of Object.entries(ex.nodes)) { if (!n.text) err(`lesson ${l.id} branch node ${id} needs text`); if (!n.end && (!n.choices || n.choices.length < 2)) err(`lesson ${l.id} branch node ${id} needs 2+ choices or end`); for (const c of n.choices ?? []) { if (!ex.nodes[c.next]) err(`lesson ${l.id} branch choice -> ${c.next} missing`); if (!c.feedback) err(`lesson ${l.id} branch choice "${c.label}" needs feedback`); } } }
    if (ex.widget === 'dial' && ex.dimensions.length < 3) err(`lesson ${l.id} dial needs 3+ dimensions`);
  } else err(`lesson ${l.id} example.kind must be text or interactive`);
  if (!Array.isArray(b.microCheck)) err(`lesson ${l.id} microCheck must be an array`);
  else {
    if (!isOrientation && b.microCheck.length < 1) err(`lesson ${l.id} needs at least one micro-check question`);
    for (const qid of b.microCheck) { const q = questionById.get(qid); if (!q) err(`lesson ${l.id} microCheck ${qid} not found`); else if (q.pool !== 'practice') err(`lesson ${l.id} microCheck ${qid} must be a practice-pool item`); else if (q.topicId !== mod.id) err(`lesson ${l.id} microCheck ${qid} belongs to another topic`); }
  }
  if (!b.recap || !Array.isArray(b.recap.bullets) || b.recap.bullets.length !== 3) err(`lesson ${l.id} recap needs exactly 3 bullets`);
  if (!b.recap?.source || !SECTIONS.has(b.recap.source.section) || !b.recap.source.title) err(`lesson ${l.id} recap.source invalid`);
  for (const term of l.glossary ?? []) if (!glossaryTerms.has(term.toLowerCase())) err(`lesson ${l.id} glossary term "${term}" not in content/glossary.json or draft.glossaryAdditions`);
  const text = JSON.stringify(l);
  if (/—/.test(text)) warn(`lesson ${l.id} contains an em dash`);
});
if (!isOrientation && (lessonIds.size < 4 || lessonIds.size > 7)) err(`module needs 4 to 7 lessons, has ${lessonIds.size}`);
const taught = new Set((mod.lessons ?? []).flatMap(l => l.objectiveIds));
for (const o of objectiveIds) if (!taught.has(o)) err(`objective ${o} is not taught by any lesson`);
const used = new Set((mod.lessons ?? []).map(l => l.beats?.explainer?.storyboardId));
for (const id of storyboardIds) if (!used.has(id)) warn(`storyboard ${id} not used by any lesson`);

// Misconceptions
const tags = new Set();
for (const m of draft.misconceptions ?? []) {
  if (!m.tag || !/^[a-z0-9-]+$/.test(m.tag)) err(`misconception tag "${m.tag}" must be kebab-case`);
  if (tags.has(m.tag)) err(`duplicate misconception tag ${m.tag}`);
  tags.add(m.tag);
  if (!m.description || m.description.length < 30) err(`misconception ${m.tag} description too short`);
  if (!Array.isArray(m.remedyLessonIds) || m.remedyLessonIds.length === 0) err(`misconception ${m.tag} needs remedyLessonIds`);
  for (const l of m.remedyLessonIds ?? []) if (!lessonIds.has(l)) err(`misconception ${m.tag} remedy lesson ${l} not in module`);
}

// Questions
const block = isOrientation ? null : [BLOCK_START[mod.id], BLOCK_START[mod.id] + 29];
const keyCounts = { a: 0, b: 0, c: 0, d: 0 };
const checkByObjective = new Map();
let practice = 0, check = 0;
const seenIds = new Set();
for (const q of draftQuestions) {
  const n = Number(q.id?.slice(1));
  if (!/^Q\d{3}$/.test(q.id ?? '') || !block || n < block[0] || n > block[1]) err(`question ${q.id} id outside block Q${block?.[0]}..Q${block?.[1]}`);
  if (seenIds.has(q.id)) err(`duplicate question id ${q.id}`);
  seenIds.add(q.id);
  if (bank.questions.some(b => b.id === q.id)) err(`question ${q.id} already exists in the bank`);
  if (q.topicId !== mod.id) err(`question ${q.id} topicId mismatch`);
  if (!['foundation', 'applied', 'advanced'].includes(q.difficulty)) err(`question ${q.id} difficulty invalid`);
  if (!['practice', 'check'].includes(q.pool)) err(`question ${q.id} pool must be practice or check`);
  if (q.pool === 'practice') practice++; else check++;
  if (!Array.isArray(q.objectiveIds) || q.objectiveIds.length === 0) err(`question ${q.id} needs objectiveIds`);
  for (const o of q.objectiveIds ?? []) { if (!objectiveIds.has(o)) err(`question ${q.id} objective ${o} not in module`); if (q.pool === 'check') checkByObjective.set(o, (checkByObjective.get(o) ?? 0) + 1); }
  if (!q.question || q.question.length < 15) err(`question ${q.id} text too short`);
  if (!Array.isArray(q.options) || q.options.length !== 4 || [...q.options.map(o => o.id)].sort().join('') !== 'abcd') err(`question ${q.id} needs options a, b, c, d`);
  else {
    if (new Set(q.options.map(o => o.text.trim().toLowerCase())).size !== 4) err(`question ${q.id} has duplicate option text`);
    if (!q.options.some(o => o.id === q.correctOptionId)) err(`question ${q.id} correctOptionId invalid`);
    else keyCounts[q.correctOptionId]++;
    const correct = q.options.find(o => o.id === q.correctOptionId)?.text.length ?? 0;
    const others = q.options.filter(o => o.id !== q.correctOptionId).map(o => o.text.length);
    const avg = others.reduce((a, b) => a + b, 0) / others.length;
    if (correct > avg * 1.8 + 15) warn(`question ${q.id}: correct option is much longer than the distractors (${correct} vs avg ${Math.round(avg)})`);
    for (const o of q.options) if (/all of the above|none of the above/i.test(o.text)) err(`question ${q.id}: avoid "all/none of the above"`);
  }
  if (!q.explanation || q.explanation.length < 60) err(`question ${q.id} explanation too short (two sentences expected)`);
  if (!q.reviewTip || q.reviewTip.length < 10) err(`question ${q.id} reviewTip too short`);
  if (!q.source || !SECTIONS.has(q.source.section) || !q.source.title || !['direct', 'application'].includes(q.source.kind)) err(`question ${q.id} source invalid`);
  if (q.misconceptions) {
    for (const [opt, tag] of Object.entries(q.misconceptions)) {
      if (opt === q.correctOptionId) err(`question ${q.id}: misconception tag on the correct option`);
      if (!q.options?.some(o => o.id === opt)) err(`question ${q.id}: misconception option ${opt} unknown`);
      if (!tags.has(tag)) err(`question ${q.id}: misconception tag ${tag} not defined in draft.misconceptions`);
    }
  } else if (q.pool === 'check') warn(`question ${q.id}: check item has no misconception tags`);
  if (/—/.test(JSON.stringify(q))) warn(`question ${q.id} contains an em dash`);
}
if (!isOrientation) {
  if (practice < 8 || practice > 12) err(`practice pool needs 8..12 items, has ${practice}`);
  if (check < 12 || check > 15) err(`check pool needs 12..15 items, has ${check}`);
  for (const o of objectiveIds) if ((checkByObjective.get(o) ?? 0) < 2) err(`objective ${o} needs at least 2 check items, has ${checkByObjective.get(o) ?? 0}`);
  if (checkByObjective.size < 4) err('check pool must cover at least 4 objectives');
  const total = draftQuestions.length;
  for (const [k, c] of Object.entries(keyCounts)) if (total && (c < total * 0.15 || c > total * 0.35)) warn(`answer key ${k} used ${c}/${total} times; aim for roughly balanced keys`);
  const micro = new Set((mod.lessons ?? []).flatMap(l => l.beats?.microCheck ?? []));
  for (const q of draftQuestions) if (q.pool === 'practice' && !micro.has(q.id)) warn(`practice item ${q.id} is not used by any lesson micro-check`);
}

// Diagnostic tags
if (!isOrientation) {
  const diagnostic = bank.questions.filter(q => q.topicId === mod.id && (q.pool ?? 'diagnostic') === 'diagnostic');
  const dt = draft.diagnosticTags ?? {};
  for (const q of diagnostic) {
    const t = dt[q.id];
    if (!t) { err(`diagnosticTags missing for ${q.id}`); continue; }
    if (!Array.isArray(t.objectiveIds) || t.objectiveIds.length === 0) err(`diagnosticTags ${q.id} needs objectiveIds`);
    for (const o of t.objectiveIds ?? []) if (!objectiveIds.has(o)) err(`diagnosticTags ${q.id} objective ${o} not in module`);
    for (const [opt, tag] of Object.entries(t.misconceptions ?? {})) { if (opt === q.correctOptionId) err(`diagnosticTags ${q.id}: tag on correct option`); if (!q.options.some(o => o.id === opt)) err(`diagnosticTags ${q.id}: option ${opt} unknown`); if (!tags.has(tag)) err(`diagnosticTags ${q.id}: tag ${tag} undefined`); }
  }
  for (const id of Object.keys(dt)) if (!diagnostic.some(q => q.id === id)) err(`diagnosticTags has unknown or non-diagnostic id ${id}`);
}
for (const g of draft.glossaryAdditions ?? []) { if (!g.term || !g.definition || !SECTIONS.has(g.section)) err(`glossaryAddition "${g.term}" needs term, definition and a valid section`); if (glossary.some(x => x.term.toLowerCase() === g.term.toLowerCase())) err(`glossaryAddition "${g.term}" already exists`); }

report();
function report() {
  for (const w of warnings) console.log('warn  ' + w);
  for (const e of errors) console.log('ERROR ' + e);
  console.log(`${path.basename(file)}: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}
