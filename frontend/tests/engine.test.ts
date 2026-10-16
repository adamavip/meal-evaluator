import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createAttempt, finishAttempt } from '../lib/assessment.ts';
import type { Attempt, Bank, Question } from '../lib/assessment.ts';
import type { Module, Misconception } from '../lib/content.ts';
import { TOPICS } from '../lib/topics.ts';
import type { TopicId } from '../lib/topics.ts';
import { applyCheckFailure, applyRecheckFailure, buildPlan, entryMinutes, markKnown, markMastered, nextForYou, orderPlan, planMinutes, statusFor, targetLessons, topicSignals } from '../lib/plan.ts';
import type { Confidence } from '../lib/plan.ts';
import { cooldownUntil, createCheck, drawCheckItems, finishCheck, recheckDue, restoreCheck, scoreCheck, CHECK_SIZE, MIN_OBJECTIVES } from '../lib/checks.ts';

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const bank = read('../data/question-bank.json') as Bank;
const modules = (readdirSync(new URL('../content/modules/', import.meta.url)).filter(f => f.endsWith('.json')).map(f => read(`../content/modules/${f}`)) as Module[]).sort((a, b) => a.order - b.order);
const courseModules = modules.filter(m => m.assessed);
const misconceptions = read('../content/misconceptions.json') as Misconception[];
const byId = new Map(bank.questions.map(q => [q.id, q]));
function seeded(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
const wrongOption = (q: Question) => q.options.find(o => o.id !== q.correctOptionId)!.id;

function answered(attempt: Attempt, decide: (q: Question, index: number) => { correct: boolean; confidence: Confidence }) {
  const confidence: Record<string, Confidence> = {};
  attempt.items.forEach((item, i) => {
    const q = byId.get(item.questionId)!;
    const d = decide(q, i);
    attempt.answers[q.id] = d.correct ? q.correctOptionId : wrongOption(q);
    confidence[q.id] = d.confidence;
  });
  return { attempt: finishAttempt(attempt), confidence };
}

test('status rules cover every combination of asked, correct, foundation and confidence', () => {
  assert.equal(statusFor({ asked: 1, correct: 0, foundationMiss: true, confidentMiss: false, unsureCorrect: false }), 'start-here');
  assert.equal(statusFor({ asked: 2, correct: 0, foundationMiss: false, confidentMiss: false, unsureCorrect: false }), 'start-here');
  assert.equal(statusFor({ asked: 2, correct: 1, foundationMiss: true, confidentMiss: false, unsureCorrect: true }), 'start-here', 'foundation miss wins over everything');
  assert.equal(statusFor({ asked: 2, correct: 1, foundationMiss: false, confidentMiss: false, unsureCorrect: false }), 'review');
  assert.equal(statusFor({ asked: 2, correct: 1, foundationMiss: false, confidentMiss: true, unsureCorrect: false }), 'review');
  assert.equal(statusFor({ asked: 2, correct: 1, foundationMiss: false, confidentMiss: false, unsureCorrect: true }), 'review', 'a miss outranks unsure-correct');
  assert.equal(statusFor({ asked: 1, correct: 1, foundationMiss: false, confidentMiss: false, unsureCorrect: true }), 'check-first');
  assert.equal(statusFor({ asked: 2, correct: 2, foundationMiss: false, confidentMiss: false, unsureCorrect: true }), 'check-first', 'all correct with any unsure answer');
  assert.equal(statusFor({ asked: 1, correct: 1, foundationMiss: false, confidentMiss: false, unsureCorrect: false }), 'looking-good');
  assert.equal(statusFor({ asked: 2, correct: 2, foundationMiss: false, confidentMiss: false, unsureCorrect: false }), 'looking-good');
});

test('an all-correct, all-sure diagnostic yields a plan with no study time', () => {
  const { attempt, confidence } = answered(createAttempt(bank, 'A', seeded(3)), () => ({ correct: true, confidence: 'sure' }));
  const plan = buildPlan(bank, attempt, confidence, courseModules, misconceptions);
  for (const t of TOPICS) { assert.equal(plan[t.id].status, 'looking-good'); assert.equal(plan[t.id].gap, 0); assert.equal(plan[t.id].startAt.length, 0); }
  assert.equal(planMinutes(plan, courseModules), 0);
});

test('gap score weights difficulty and confident misses and orders the plan within a band', () => {
  const attempt = createAttempt(bank, 'B', seeded(11));
  const { attempt: done, confidence } = answered(attempt, () => ({ correct: false, confidence: 'sure' }));
  const signals = topicSignals(bank, done, confidence);
  for (const t of TOPICS) {
    const expected = done.items.map(i => byId.get(i.questionId)!).filter(q => q.topicId === t.id).reduce((n, q) => n + ({ foundation: 1.5, applied: 1, advanced: .7 }[q.difficulty]) + .5, 0);
    assert.equal(signals[t.id].gap, Math.round(expected * 10) / 10, t.id);
    assert.equal(signals[t.id].confidentMiss, true);
  }
  const plan = buildPlan(bank, done, confidence, courseModules, misconceptions);
  const order = orderPlan(plan, courseModules);
  for (let i = 1; i < order.length; i++) {
    const a = plan[order[i - 1]], b = plan[order[i]];
    assert.ok(a.gap > b.gap || (a.gap === b.gap && courseModules.findIndex(m => m.id === order[i - 1]) < courseModules.findIndex(m => m.id === order[i])), `order at ${i}`);
  }
  for (const t of TOPICS) assert.equal(plan[t.id].status, 'start-here');
  assert.equal(planMinutes(plan, courseModules), courseModules.reduce((n, m) => n + m.minutes, 0));
});

test('lesson-level targeting points a miss at the lessons teaching its objectives and its misconception remedies', () => {
  const tagged = bank.questions.find(q => q.pool === 'diagnostic' && q.misconceptions && Object.keys(q.misconceptions).length)!;
  const [distractor, tag] = Object.entries(tagged.misconceptions!)[0];
  const targeting = targetLessons([{ question: tagged, selectedId: distractor }], courseModules, misconceptions);
  const remedy = misconceptions.find(m => m.tag === tag)!;
  assert.equal(targeting.misconceptions.length, 1);
  assert.equal(targeting.misconceptions[0].tag, tag);
  for (const id of remedy.remedyLessonIds) assert.ok(targeting.startAt.some(l => l.id === id), `remedy ${id} in startAt`);
  for (const l of courseModules.flatMap(m => m.lessons)) if (l.objectiveIds.some(o => tagged.objectiveIds.includes(o))) assert.ok(targeting.startAt.some(x => x.id === l.id), `objective lesson ${l.id}`);
  const untagged = targetLessons([{ question: tagged, selectedId: tagged.correctOptionId }], courseModules, misconceptions);
  assert.equal(untagged.misconceptions.length, 0);
});

test('a single applied miss gives review with a named start lesson and a confident-miss reason; mark as known and mastery update the plan', () => {
  const attempt = createAttempt(bank, 'C', seeded(5));
  // Pick a topic asked twice with at least one non-foundation item, so one applied miss leaves one correct answer.
  const target = TOPICS.map(t => t.id).find(id => { const qs = attempt.items.map(i => byId.get(i.questionId)!).filter(q => q.topicId === id); return qs.length === 2 && qs.some(q => q.difficulty !== 'foundation'); })!;
  assert.ok(target, 'seed must yield a doubled topic with an applied item');
  let missed = false;
  const { attempt: done, confidence } = answered(attempt, q => {
    if (q.topicId === target && q.difficulty !== 'foundation' && !missed) { missed = true; return { correct: false, confidence: 'sure' }; }
    return { correct: true, confidence: 'sure' };
  });
  const plan = buildPlan(bank, done, confidence, courseModules, misconceptions);
  assert.equal(plan[target].status, 'review');
  assert.ok(plan[target].startAt.length > 0);
  assert.ok(plan[target].reasons[0].startsWith('Start at lesson'));
  assert.ok(plan[target].reasons.some(r => r.includes('confidently wrong')));
  const module = courseModules.find(m => m.id === target)!;
  const minutes = entryMinutes(plan[target], module);
  assert.ok(minutes > 5 && minutes < module.minutes);
  const next = nextForYou(plan, courseModules, new Set());
  assert.ok(next && plan[target].startAt.includes(next.id));
  const known = markKnown(plan, target);
  assert.equal(known[target].status, 'looking-good');
  assert.equal(known[target].known, true);
  assert.equal(nextForYou(known, courseModules, new Set()), null);
  const mastered = markMastered(plan, target);
  assert.equal(mastered[target].status, 'mastered');
  assert.equal(entryMinutes(mastered[target], module), 0);
});

test('check failure lists lessons for missed objectives; a re-check failure moves to review, never to start here', () => {
  const target = TOPICS[0].id;
  const { attempt, confidence } = answered(createAttempt(bank, 'D', seeded(9)), () => ({ correct: true, confidence: 'sure' }));
  const plan = markMastered(buildPlan(bank, attempt, confidence, courseModules, misconceptions), target);
  const module = courseModules.find(m => m.id === target)!;
  const objective = module.objectives[1].id;
  const failed = applyCheckFailure(plan, target, [objective], courseModules);
  assert.equal(failed[target].status, 'review');
  assert.deepEqual(failed[target].startAt, module.lessons.filter(l => l.objectiveIds.includes(objective)).map(l => l.id));
  const rechecked = applyRecheckFailure(plan, target, [objective], courseModules);
  assert.equal(rechecked[target].status, 'review');
  const startHere = { ...plan, [target]: { ...plan[target], status: 'start-here' as const } };
  assert.equal(applyCheckFailure(startHere, target, [objective], courseModules)[target].status, 'start-here', 'a failed check keeps start-here');
  assert.equal(applyRecheckFailure(startHere, target, [objective], courseModules)[target].status, 'review');
});

test('check draws take 5 unseen items covering at least 4 objectives and never reuse a seen item until the pool is exhausted', () => {
  for (const t of TOPICS) {
    const pool = bank.questions.filter(q => q.topicId === t.id && q.pool === 'check');
    const rng = seeded(t.id.length * 17);
    let seen: string[] = [];
    const draws: string[][] = [];
    for (let i = 0; i < 20; i++) {
      const items = drawCheckItems(bank, t.id, seen, rng);
      assert.equal(items.length, CHECK_SIZE);
      assert.equal(new Set(items.map(q => q.id)).size, CHECK_SIZE);
      for (const q of items) { assert.equal(q.pool, 'check'); assert.equal(q.topicId, t.id); }
      assert.ok(new Set(items.flatMap(q => q.objectiveIds)).size >= MIN_OBJECTIVES, `${t.id} draw ${i}: objectives`);
      const unseenAvailable = pool.filter(q => !seen.includes(q.id)).length;
      const reused = items.filter(q => seen.includes(q.id)).length;
      assert.equal(reused, Math.max(0, CHECK_SIZE - unseenAvailable), `${t.id} draw ${i}: reused ${reused} with ${unseenAvailable} unseen`);
      draws.push(items.map(q => q.id));
      seen = [...seen.filter(id => !items.some(q => q.id === id)), ...items.map(q => q.id)];
    }
    // Across the first full cycle (pool size / 5 draws) no item repeats.
    const cycle = Math.floor(pool.length / CHECK_SIZE);
    const firstCycle = draws.slice(0, cycle).flat();
    assert.equal(new Set(firstCycle).size, firstCycle.length, `${t.id}: repeat inside the first cycle`);
  }
});

test('check scoring, pass mark, cool-down after two consecutive failures and spaced re-check timing', () => {
  const topic = TOPICS[4].id;
  const rng = seeded(42);
  const make = (correct: number, finishedAt: string) => {
    const attempt = createCheck(bank, topic, [], rng);
    attempt.items.forEach((item, i) => { const q = byId.get(item.questionId)!; attempt.answers[q.id] = i < correct ? q.correctOptionId : wrongOption(q); });
    return finishCheck(attempt, finishedAt);
  };
  const pass = make(4, '2026-10-13T10:00:00.000Z');
  const fail = make(3, '2026-10-13T10:05:00.000Z');
  assert.equal(scoreCheck(bank, pass).passed, true);
  assert.equal(scoreCheck(bank, pass).percent, 80);
  assert.equal(scoreCheck(bank, fail).passed, false);
  assert.ok(scoreCheck(bank, fail).missedObjectiveIds.length >= 1);
  assert.equal(cooldownUntil(bank, [fail], Date.parse('2026-10-13T10:06:00.000Z')), null, 'one failure: no cool-down');
  assert.equal(cooldownUntil(bank, [pass, fail], Date.parse('2026-10-13T10:06:00.000Z')), null, 'pass then fail: no cool-down');
  const fail2 = make(2, '2026-10-13T10:10:00.000Z');
  assert.equal(cooldownUntil(bank, [fail, fail2], Date.parse('2026-10-13T10:12:00.000Z')), '2026-10-13T10:20:00.000Z');
  assert.equal(cooldownUntil(bank, [fail, fail2], Date.parse('2026-10-13T10:21:00.000Z')), null, 'cool-down expired');
  assert.throws(() => finishCheck(createCheck(bank, topic, [], rng)), /Answer every question/);
  assert.equal(recheckDue(undefined), false);
  assert.equal(recheckDue({ masteredAt: '2026-10-01T00:00:00.000Z' }, Date.parse('2026-10-07T00:00:00.000Z')), false);
  assert.equal(recheckDue({ masteredAt: '2026-10-01T00:00:00.000Z' }, Date.parse('2026-10-08T00:00:00.000Z')), true);
  assert.equal(recheckDue({ masteredAt: '2026-10-01T00:00:00.000Z', lastRecheckAt: '2026-10-08T00:00:00.000Z' }, Date.parse('2026-10-10T00:00:00.000Z')), false);
  const recheck = createCheck(bank, topic, [], rng, 'recheck');
  assert.equal(recheck.items.length, 3);
  assert.deepEqual(restoreCheck(JSON.parse(JSON.stringify(pass)), bank), pass);
  assert.equal(restoreCheck({ ...pass, items: pass.items.slice(1) }, bank), null);
  assert.equal(restoreCheck({ ...pass, topicId: TOPICS[1].id }, bank), null, 'items must belong to the check topic');
  assert.equal(restoreCheck({ ...pass, answers: { ...pass.answers, Q001: 'a' } }, bank), null);
  assert.equal(restoreCheck({ ...pass, bankVersion: 'old' }, bank), null);
});

test('every diagnostic topic combination produces a justified plan entry', () => {
  // Exhaustive: for each seed, random correctness and confidence, every entry has a status, at least one reason and a non-negative gap.
  for (let seed = 1; seed <= 40; seed++) {
    const rng = seeded(seed * 7);
    const { attempt, confidence } = answered(createAttempt(bank, '', seeded(seed)), () => ({ correct: rng() > .4, confidence: rng() > .5 ? 'sure' : 'unsure' }));
    const plan = buildPlan(bank, attempt, confidence, courseModules, misconceptions);
    for (const t of TOPICS) {
      const e = plan[t.id];
      assert.ok(['start-here', 'review', 'check-first', 'looking-good'].includes(e.status));
      assert.ok(e.reasons.length >= 1 && e.reasons.every(r => r.length > 10));
      assert.ok(e.gap >= 0);
      if (e.status === 'start-here') assert.deepEqual(e.startAt, [courseModules.find(m => m.id === t.id)!.lessons[0].id]);
      if (e.status === 'review') assert.ok(e.startAt.length >= 1, `${t.id}: review needs a start lesson`);
      for (const id of e.startAt) assert.ok(courseModules.find(m => m.id === t.id)!.lessons.some(l => l.id === id));
    }
    const typedId: TopicId = TOPICS[0].id;
    assert.ok(plan[typedId]);
  }
});
