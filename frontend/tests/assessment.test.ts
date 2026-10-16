import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAttempt, scoreAttempt, finishAttempt, restoreAttempt, answeredCount } from '../lib/assessment.ts';
import type { Bank } from '../lib/assessment.ts';
import { TOPICS } from '../lib/topics.ts';

const bank = JSON.parse(readFileSync(new URL('../data/question-bank.json', import.meta.url), 'utf8')) as Bank;
const questionById = new Map(bank.questions.map(q => [q.id, q]));
function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('bank contains complete, unique, grounded items; the diagnostic pool is 100 items, ten per topic', () => {
  const diagnostic = bank.questions.filter(q => q.pool === 'diagnostic');
  assert.equal(diagnostic.length, 100);
  assert.equal(new Set(bank.questions.map(q => q.id)).size, bank.questions.length);
  assert.equal(new Set(bank.questions.map(q => q.question)).size, bank.questions.length);
  const validSections = new Set(['1','1.1','1.2','1.3','2','2.1','2.2','2.3','2.4','2.5','2.6','2.7','3','3.1','3.2','3.3','4','4.1','4.2','4.3','5','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','5.9','5.10','6','6.1','6.2','Annex A']);
  for (const t of TOPICS) assert.equal(diagnostic.filter(q => q.topicId === t.id).length, 10, t.id);
  for (const [i, q] of diagnostic.entries()) assert.equal(q.id, `Q${String(i + 1).padStart(3, '0')}`);
  for (const q of bank.questions) {
    assert.equal(q.options.length, 4, q.id);
    assert.deepEqual([...q.options.map(o => o.id)].sort(), ['a','b','c','d']);
    assert.equal(new Set(q.options.map(o => o.text.trim().toLowerCase())).size, 4, q.id);
    assert.equal(q.options.filter(o => o.id === q.correctOptionId).length, 1, q.id);
    assert.ok(q.question.length > 15 && q.explanation.length > 30 && q.reviewTip.length > 10, q.id);
    assert.ok(validSections.has(q.source.section), `${q.id}: invalid source`);
    assert.ok(q.source.title.length > 3);
    assert.ok(['direct', 'application'].includes(q.source.kind));
    assert.ok(['foundation', 'applied', 'advanced'].includes(q.difficulty));
  }
  assert.ok(diagnostic.filter(q => q.source.kind === 'application').length >= 35);
  assert.equal(readFileSync(new URL('../public/question-bank.json', import.meta.url), 'utf8'), readFileSync(new URL('../data/question-bank.json', import.meta.url), 'utf8'));
});

test('100 seeded draws have 15 unique questions, all topics and valid shuffled options', () => {
  const draws = new Set<string>();
  const seen = new Set<string>();
  let rearranged = false;
  for (let seed = 1; seed <= 100; seed++) {
    const attempt = createAttempt(bank, ' Test attendee ', seeded(seed));
    assert.equal(attempt.name, 'Test attendee');
    assert.equal(attempt.items.length, 15);
    assert.equal(new Set(attempt.items.map(i => i.questionId)).size, 15);
    const counts = TOPICS.map(t => attempt.items.filter(i => questionById.get(i.questionId)!.topicId === t.id).length);
    assert.equal(counts.filter(n => n === 1).length, 5);
    assert.equal(counts.filter(n => n === 2).length, 5);
    for (const item of attempt.items) {
      seen.add(item.questionId);
      assert.deepEqual([...item.optionIds].sort(), ['a','b','c','d']);
      if (item.optionIds.join('') !== 'abcd') rearranged = true;
    }
    draws.add(attempt.items.map(i => i.questionId).join(','));
    assert.deepEqual(restoreAttempt(JSON.stringify(attempt), bank), attempt);
  }
  assert.equal(draws.size, 100);
  assert.equal(seen.size, 100);
  assert.ok(rearranged);
});

test('scoring uses stable answer IDs after options are shuffled', () => {
  const attempt = createAttempt(bank, 'Attendee', seeded(71));
  for (const item of attempt.items) attempt.answers[item.questionId] = questionById.get(item.questionId)!.correctOptionId;
  assert.equal(answeredCount(attempt), 15);
  const complete = finishAttempt(attempt);
  assert.ok(complete.finishedAt);
  assert.equal(attempt.finishedAt, null, 'completion does not mutate the original');
  const result = scoreAttempt(bank, complete);
  assert.equal(result.percent, 100);
  assert.equal(result.correct, 15);
  assert.equal(result.total, 15);
  assert.ok(result.topics.every(t => t.percent === 100));
  assert.equal(result.topics.reduce((n, t) => n + t.asked, 0), 15);
  assert.deepEqual(restoreAttempt(JSON.stringify(complete), bank), complete);
});

test('mixed and zero scores use correct denominators and whole-number rounding', () => {
  const attempt = createAttempt(bank, '', seeded(31));
  attempt.items.forEach((item, index) => {
    const q = questionById.get(item.questionId)!;
    attempt.answers[q.id] = index < 10 ? q.correctOptionId : q.options.find(o => o.id !== q.correctOptionId)!.id;
  });
  const result = scoreAttempt(bank, finishAttempt(attempt));
  assert.equal(result.correct, 10);
  assert.equal(result.percent, 67);
  assert.equal(result.rows.filter(r => !r.correct).length, 5);
  assert.equal(result.topics.reduce((n, t) => n + t.correct, 0), 10);
  for (const topic of result.topics) assert.equal(topic.percent, Math.round(topic.correct / topic.asked * 100));
  for (const item of attempt.items) {
    const q = questionById.get(item.questionId)!;
    attempt.answers[q.id] = q.options.find(o => o.id !== q.correctOptionId)!.id;
  }
  assert.equal(scoreAttempt(bank, attempt).percent, 0);
});

test('an incomplete attempt cannot be submitted', () => {
  const attempt = createAttempt(bank, '', seeded(17));
  assert.throws(() => finishAttempt(attempt), /Answer all 15/);
  for (const item of attempt.items.slice(0, 14)) attempt.answers[item.questionId] = 'a';
  assert.throws(() => finishAttempt(attempt), /Answer all 15/);
});

test('invalid, outdated or damaged saved progress is discarded', () => {
  const attempt = createAttempt(bank, '', seeded(87));
  const encode = (changes: object) => JSON.stringify({ ...attempt, ...changes });
  assert.equal(restoreAttempt(null, bank), null);
  assert.equal(restoreAttempt('{oops', bank), null);
  assert.equal(restoreAttempt('null', bank), null);
  assert.equal(restoreAttempt(encode({ bankVersion: 'outdated' }), bank), null);
  assert.equal(restoreAttempt(encode({ cursor: -1 }), bank), null);
  assert.equal(restoreAttempt(encode({ cursor: 15 }), bank), null);
  assert.equal(restoreAttempt(encode({ items: attempt.items.slice(1) }), bank), null);
  assert.equal(restoreAttempt(encode({ items: Array(15).fill(attempt.items[0]) }), bank), null);
  assert.equal(restoreAttempt(encode({ answers: { [attempt.items[0].questionId]: 'wrong-option' } }), bank), null);
  assert.equal(restoreAttempt(encode({ answers: { Q999: 'a' } }), bank), null);
  assert.equal(restoreAttempt(encode({ flagged: ['Q999'] }), bank), null);
  assert.equal(restoreAttempt(encode({ startedAt: 'bad-date' }), bank), null);
  assert.equal(restoreAttempt(encode({ finishedAt: new Date().toISOString() }), bank), null);
  const damaged = structuredClone(attempt);
  damaged.items[0].optionIds = ['a', 'a', 'b', 'c'];
  assert.equal(restoreAttempt(JSON.stringify(damaged), bank), null);
});
