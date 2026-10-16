import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createAttempt, finishAttempt } from '../lib/assessment.ts';
import type { Bank } from '../lib/assessment.ts';
import type { Module, Misconception } from '../lib/content.ts';
import { TOPICS } from '../lib/topics.ts';
import { buildPlan } from '../lib/plan.ts';
import { createCheck, finishCheck } from '../lib/checks.ts';
import type { LearnerState } from '../lib/learner.ts';
import { emptyLearner, exportLearner, importLearner, migrateV1, rateLesson, recordLessonCompleted, recordLessonOpened, restoreLearner, validateLearner, withSeen, masteredCount, completedLessonIds } from '../lib/learner.ts';

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const bank = read('../data/question-bank.json') as Bank;
const modules = (readdirSync(new URL('../content/modules/', import.meta.url)).filter(f => f.endsWith('.json')).map(f => read(`../content/modules/${f}`)) as Module[]).sort((a, b) => a.order - b.order);
const courseModules = modules.filter(m => m.assessed);
const misconceptions = read('../content/misconceptions.json') as Misconception[];
const lessonIds = new Set(modules.flatMap(m => m.lessons.map(l => l.id)));
const byId = new Map(bank.questions.map(q => [q.id, q]));
function seeded(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

function fullState() {
  const attempt = createAttempt(bank, 'Amina', seeded(21));
  for (const item of attempt.items) attempt.answers[item.questionId] = byId.get(item.questionId)!.correctOptionId;
  const done = finishAttempt(attempt);
  const confidence = Object.fromEntries(done.items.map(i => [i.questionId, 'sure' as const]));
  let state: LearnerState = { ...emptyLearner(bank), name: 'Amina', persona: 'field-officer' as const, diagnostic: done, confidence, plan: buildPlan(bank, done, confidence, courseModules, misconceptions) };
  state = withSeen(state, done.items.map(i => i.questionId));
  state = recordLessonCompleted(rateLesson(recordLessonOpened(state, 'L3.1'), 'L3.1', 'clear'), 'L3.1');
  const check = createCheck(bank, TOPICS[2].id, state.seenQuestionIds, seeded(8));
  for (const item of check.items) check.answers[item.questionId] = byId.get(item.questionId)!.correctOptionId;
  const finished = finishCheck(check);
  state = { ...state, checks: { [TOPICS[2].id]: { attempts: [finished], masteredAt: finished.finishedAt! } }, capstone: { completedAt: new Date().toISOString(), choices: { d1: 'a' } } };
  return withSeen(state, finished.items.map(i => i.questionId));
}

test('a complete v2 state survives a JSON round trip, export and import', () => {
  const state = fullState();
  assert.deepEqual(validateLearner(JSON.parse(JSON.stringify(state)), bank, lessonIds), state);
  const exported = exportLearner(state);
  const imported = importLearner(exported, bank, lessonIds);
  assert.ok(imported);
  assert.equal(imported!.name, 'Amina');
  assert.equal(masteredCount(imported), 1);
  assert.ok(completedLessonIds(imported).has('L3.1'));
  assert.equal(imported!.lessons['L3.1'].rating, 'clear');
  assert.equal(imported!.activeCheck, null, 'an in-progress check is not exported');
  assert.equal(restoreLearner(exported, null, bank, lessonIds)?.diagnostic?.id, state.diagnostic!.id);
});

test('a legacy storage record with the current bank version migrates into v2', () => {
  const attempt = createAttempt(bank, 'Legacy user', seeded(4));
  const legacy = JSON.stringify(attempt);
  const migrated = migrateV1(legacy, bank);
  assert.ok(migrated);
  assert.equal(migrated!.version, 2);
  assert.equal(migrated!.name, 'Legacy user');
  assert.equal(migrated!.diagnostic!.bankVersion, bank.bankVersion);
  assert.equal(migrated!.plan, null, 'no plan until the diagnostic is finished with confidence taps');
  assert.deepEqual(migrated!.seenQuestionIds, attempt.items.map(i => i.questionId));
  assert.equal(restoreLearner(null, legacy, bank, lessonIds)?.name, 'Legacy user');
  assert.equal(migrateV1(JSON.stringify({ ...attempt, bankVersion: '0.9.0' }), bank), null, 'unknown bank versions are not migrated');
  assert.equal(restoreLearner(null, null, bank, lessonIds), null);
  assert.equal(restoreLearner('{broken', legacy, bank, lessonIds), null, 'a damaged v2 record is not silently replaced by v1');
});

test('damaged v2 state is rejected field by field', () => {
  const state = fullState();
  const mutate = (changes: object) => validateLearner(JSON.parse(JSON.stringify({ ...state, ...changes })), bank, lessonIds);
  assert.equal(validateLearner(null, bank, lessonIds), null);
  assert.equal(mutate({ version: 1 }), null);
  assert.equal(mutate({ bankVersion: 'other' }), null);
  assert.equal(mutate({ name: 'x'.repeat(81) }), null);
  assert.equal(mutate({ persona: 'wizard' }), null);
  assert.equal(mutate({ confidence: { Q999: 'sure' } }), null, 'confidence must reference diagnostic items');
  assert.equal(mutate({ confidence: { [state.diagnostic!.items[0].questionId]: 'maybe' } }), null);
  assert.equal(mutate({ plan: { ...state.plan, [TOPICS[0].id]: { ...state.plan![TOPICS[0].id], status: 'done' } } }), null);
  assert.equal(mutate({ plan: { ...state.plan, [TOPICS[0].id]: { ...state.plan![TOPICS[0].id], startAt: ['L9.9'] } } }), null);
  const { [TOPICS[0].id]: _dropped, ...partial } = state.plan!;
  assert.equal(mutate({ plan: partial }), null, 'plan must cover every topic');
  assert.equal(mutate({ diagnostic: null }), null, 'a plan without a diagnostic is inconsistent');
  assert.equal(mutate({ lessons: { 'L0.0': { opened: new Date().toISOString() } } }), null);
  assert.equal(mutate({ lessons: { 'L3.1': { opened: 'yesterday' } } }), null);
  assert.equal(mutate({ lessons: { 'L3.1': { opened: new Date().toISOString(), rating: 'meh' } } }), null);
  assert.equal(mutate({ checks: { 'not-a-topic': { attempts: [] } } }), null);
  assert.equal(mutate({ checks: { [TOPICS[2].id]: { attempts: [{ ...state.checks[TOPICS[2].id]!.attempts[0], finishedAt: null }] } } }), null, 'stored attempts must be finished');
  assert.equal(mutate({ checks: { [TOPICS[2].id]: { attempts: [], masteredAt: 'soon' } } }), null);
  assert.equal(mutate({ seenQuestionIds: ['Q001', 'Q001'] }), null);
  assert.equal(mutate({ seenQuestionIds: ['Q999'] }), null);
  assert.equal(mutate({ capstone: { completedAt: 'bad', choices: {} } }), null);
  assert.equal(mutate({ capstone: { completedAt: new Date().toISOString(), choices: { d1: 1 } } }), null);
  assert.equal(mutate({ activeCheck: { ...state.checks[TOPICS[2].id]!.attempts[0] } }), null, 'an active check must be unfinished');
  const active = createCheck(bank, TOPICS[1].id, [], seeded(2));
  assert.ok(mutate({ activeCheck: active }));
});

test('seen tracking keeps order with most recent last and removes duplicates', () => {
  let state = emptyLearner(bank);
  state = withSeen(state, ['Q001', 'Q002']);
  state = withSeen(state, ['Q002', 'Q003']);
  assert.deepEqual(state.seenQuestionIds, ['Q001', 'Q002', 'Q003']);
  state = withSeen(state, ['Q001']);
  assert.deepEqual(state.seenQuestionIds, ['Q002', 'Q003', 'Q001']);
});

 test('version 3 keeps lessons and mastery but retires the old diagnostic and plan', () => {
  const state = fullState();
  const old = structuredClone(state);
  old.bankVersion = '3.0.0';
  old.diagnostic!.bankVersion = '3.0.0';
  old.diagnostic!.items.push(...old.diagnostic!.items.slice(0, 5));
  old.seenQuestionIds.push('Q001');
  for (const record of Object.values(old.checks)) for (const attempt of record!.attempts) attempt.bankVersion = '3.0.0';
  old.activeCheck = createCheck(bank, TOPICS[1].id, [], seeded(7));
  old.activeCheck.bankVersion = '3.0.0';
  const restored = restoreLearner(JSON.stringify(old), null, bank, lessonIds)!;
  assert.ok(restored);
  assert.equal(restored.bankVersion, bank.bankVersion);
  assert.equal(restored.name, state.name);
  assert.equal(restored.diagnostic, null);
  assert.equal(restored.plan, null);
  assert.deepEqual(restored.confidence, {});
  assert.deepEqual(restored.lessons, state.lessons);
  assert.deepEqual(restored.checks, state.checks);
  assert.deepEqual(restored.capstone, state.capstone);
  assert.equal(restored.activeCheck!.bankVersion, bank.bankVersion);
  assert.equal(masteredCount(restored), 1);
  assert.ok(!restored.seenQuestionIds.includes('Q001'));
  assert.deepEqual(importLearner(JSON.stringify(old), bank, lessonIds), restored);
  old.checks[TOPICS[2].id]!.attempts[0].answers = { Q999: 'a' };
  assert.equal(restoreLearner(JSON.stringify(old), null, bank, lessonIds), null);
});
