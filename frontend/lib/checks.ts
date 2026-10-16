import type { TopicId } from './topics.ts';
import { random, shuffle } from './assessment.ts';
import type { Bank, Question } from './assessment.ts';

// ---------------------------------------------------------------------------
// Mastery checks and spaced re-checks (spec 6.5). Pure functions with an
// injectable random source.
// ---------------------------------------------------------------------------

export const CHECK_SIZE = 5;
export const RECHECK_SIZE = 3;
export const PASS_MARK = 0.8;
export const MIN_OBJECTIVES = 4;
export const COOLDOWN_MS = 10 * 60 * 1000;
export const RECHECK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type CheckAttempt = {
  id: string;
  kind: 'check' | 'recheck';
  topicId: TopicId;
  bankVersion: string;
  startedAt: string;
  finishedAt: string | null;
  items: { questionId: string; optionIds: string[] }[];
  answers: Record<string, string>;
  cursor: number;
};

export const checkPool = (bank: Bank, topicId: TopicId) => bank.questions.filter(q => q.topicId === topicId && q.pool === 'check');

/**
 * Draws `size` items from the topic's check pool, preferring items the learner has not seen in this
 * browser and covering at least MIN_OBJECTIVES distinct objectives when the pool allows it. `seen` is
 * ordered oldest first; when unseen items run out the least recently seen ones are used.
 */
export function drawCheckItems(bank: Bank, topicId: TopicId, seen: readonly string[], rng: () => number = random, size = CHECK_SIZE): Question[] {
  const pool = checkPool(bank, topicId);
  if (pool.length < size) throw new Error(`Check pool for ${topicId} has ${pool.length} items; ${size} needed.`);
  const seenIndex = new Map(seen.map((id, i) => [id, i]));
  const unseen = shuffle(pool.filter(q => !seenIndex.has(q.id)), rng);
  const stale = shuffle(pool.filter(q => seenIndex.has(q.id)), rng).sort((a, b) => seenIndex.get(a.id)! - seenIndex.get(b.id)!);
  const candidates = [...unseen, ...stale];
  // Greedy selection: keep adding the first candidate that introduces a new objective until the
  // objective target is met, then fill in order. Ensures >= MIN_OBJECTIVES objectives when possible.
  const chosen: Question[] = [];
  const covered = new Set<string>();
  const remaining = [...candidates];
  while (chosen.length < size && remaining.length) {
    let index = 0;
    if (covered.size < MIN_OBJECTIVES) {
      const fresh = remaining.findIndex(q => q.objectiveIds.some(id => !covered.has(id)));
      if (fresh >= 0) index = fresh;
    }
    const [pick] = remaining.splice(index, 1);
    chosen.push(pick);
    for (const id of pick.objectiveIds) covered.add(id);
  }
  return shuffle(chosen, rng);
}

export function createCheck(bank: Bank, topicId: TopicId, seen: readonly string[], rng: () => number = random, kind: 'check' | 'recheck' = 'check'): CheckAttempt {
  const items = drawCheckItems(bank, topicId, seen, rng, kind === 'check' ? CHECK_SIZE : RECHECK_SIZE);
  return {
    id: globalThis.crypto.randomUUID(),
    kind,
    topicId,
    bankVersion: bank.bankVersion,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    items: items.map(q => ({ questionId: q.id, optionIds: shuffle(q.options.map(o => o.id), rng) })),
    answers: {},
    cursor: 0,
  };
}

export type CheckResult = { rows: { question: Question; selectedId: string | null; correct: boolean }[]; correct: number; total: number; percent: number; passed: boolean; missedObjectiveIds: string[] };

export function scoreCheck(bank: Bank, attempt: CheckAttempt): CheckResult {
  const byId = new Map(bank.questions.map(q => [q.id, q]));
  const rows = attempt.items.map(item => {
    const question = byId.get(item.questionId);
    if (!question) throw new Error('Question is missing from this bank.');
    const selectedId = attempt.answers[question.id] ?? null;
    return { question, selectedId, correct: selectedId === question.correctOptionId };
  });
  const correct = rows.filter(r => r.correct).length;
  const total = rows.length;
  const missed = new Set(rows.filter(r => !r.correct).flatMap(r => r.question.objectiveIds));
  return { rows, correct, total, percent: total ? Math.round(correct / total * 100) : 0, passed: total > 0 && correct / total >= PASS_MARK, missedObjectiveIds: [...missed] };
}

export const checkAnswered = (attempt: CheckAttempt) => attempt.items.filter(i => Boolean(attempt.answers[i.questionId])).length;

export function finishCheck(attempt: CheckAttempt, now = new Date().toISOString()): CheckAttempt {
  if (checkAnswered(attempt) !== attempt.items.length) throw new Error('Answer every question before finishing.');
  return { ...attempt, finishedAt: now };
}

/** Ten-minute cool-down after two consecutive failed checks. Returns the ISO time the cool-down ends, or null. */
export function cooldownUntil(bank: Bank, attempts: readonly CheckAttempt[], now = Date.now()): string | null {
  const finished = attempts.filter(a => a.finishedAt && a.kind === 'check');
  if (finished.length < 2) return null;
  const [prev, last] = finished.slice(-2);
  if (scoreCheck(bank, prev).passed || scoreCheck(bank, last).passed) return null;
  const until = Date.parse(last.finishedAt!) + COOLDOWN_MS;
  return until > now ? new Date(until).toISOString() : null;
}

/** A spaced re-check is due 7 or more days after mastery (or after the last re-check). */
export function recheckDue(check: { masteredAt?: string; lastRecheckAt?: string } | undefined, now = Date.now()): boolean {
  if (!check?.masteredAt) return false;
  const reference = Date.parse(check.lastRecheckAt ?? check.masteredAt);
  return Number.isFinite(reference) && now - reference >= RECHECK_AFTER_MS;
}

export function restoreCheck(raw: unknown, bank: Bank): CheckAttempt | null {
  try {
    const a = raw as CheckAttempt;
    if (!a || typeof a !== 'object' || a.bankVersion !== bank.bankVersion || typeof a.id !== 'string' || a.id.length > 80) return null;
    if (!['check', 'recheck'].includes(a.kind) || typeof a.topicId !== 'string') return null;
    if (typeof a.startedAt !== 'string' || !Number.isFinite(Date.parse(a.startedAt))) return null;
    if (a.finishedAt !== null && (typeof a.finishedAt !== 'string' || !Number.isFinite(Date.parse(a.finishedAt)))) return null;
    const size = a.kind === 'check' ? CHECK_SIZE : RECHECK_SIZE;
    if (!Array.isArray(a.items) || a.items.length !== size || new Set(a.items.map(i => i.questionId)).size !== size) return null;
    if (!Number.isInteger(a.cursor) || a.cursor < 0 || a.cursor >= size) return null;
    if (!a.answers || typeof a.answers !== 'object' || Array.isArray(a.answers)) return null;
    const byId = new Map(bank.questions.map(q => [q.id, q]));
    for (const item of a.items) {
      const q = byId.get(item.questionId);
      if (!q || q.topicId !== a.topicId || q.pool !== 'check' || !Array.isArray(item.optionIds) || item.optionIds.length !== q.options.length || new Set(item.optionIds).size !== q.options.length || item.optionIds.some(id => !q.options.some(o => o.id === id))) return null;
    }
    for (const [id, optionId] of Object.entries(a.answers)) if (!a.items.some(i => i.questionId === id) || !byId.get(id)?.options.some(o => o.id === optionId)) return null;
    if (a.finishedAt && checkAnswered(a) !== size) return null;
    return a;
  } catch { return null; }
}
