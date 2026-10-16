import { TOPICS } from './topics.ts';
import type { TopicId } from './topics.ts';

export type Option = { id: string; text: string };
export type Question = {
  id: string;
  topicId: TopicId;
  difficulty: 'foundation' | 'applied' | 'advanced';
  question: string;
  options: Option[];
  correctOptionId: string;
  explanation: string;
  source: { section: string; title: string; kind: 'direct' | 'application' };
  reviewTip: string;
  objectiveIds: string[];
  pool: 'diagnostic' | 'practice' | 'check';
  misconceptions?: Record<string, string>;
};
export type Bank = { bankVersion: string; sourceDocument: string; questions: Question[] };
export type Attempt = {
  id: string;
  bankVersion: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  items: { questionId: string; optionIds: string[] }[];
  answers: Record<string, string>;
  flagged: string[];
  cursor: number;
};
export type TopicScore = { topicId: TopicId; asked: number; correct: number; percent: number };
export const SESSION_SIZE = 10;
/** Legacy (v1) storage key. Learner state v2 lives under lib/learner.ts STORAGE_KEY and migrates from this key. */
export const STORAGE_KEY = 'cimmyt-meal-assessment-v1';
export const diagnosticPool = (bank: Bank) => bank.questions.filter(q => q.pool === 'diagnostic');

// Browser cryptography supplies the draw. Tests inject a seeded random function.
export function random(): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0] / 4294967296;
}

export function shuffle<T>(items: readonly T[], rng: () => number = random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createAttempt(bank: Bank, name = '', rng: () => number = random): Attempt {
  // Every learner sees the ten workshop messages; only display order changes.
  const selected = diagnosticPool(bank);
  if (selected.length !== SESSION_SIZE || TOPICS.some(t => !selected.some(q => q.topicId === t.id))) {
    throw new Error('The diagnostic needs 10 questions covering every topic.');
  }
  return {
    id: globalThis.crypto.randomUUID(),
    bankVersion: bank.bankVersion,
    name: name.trim().slice(0, 80),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    items: shuffle(selected, rng).map(q => ({ questionId: q.id, optionIds: shuffle(q.options.map(o => o.id), rng) })),
    answers: {},
    flagged: [],
    cursor: 0,
  };
}

export function answeredCount(attempt: Attempt): number {
  return attempt.items.filter(item => Boolean(attempt.answers[item.questionId])).length;
}

export function scoreAttempt(bank: Bank, attempt: Attempt) {
  const byId = new Map(bank.questions.map(q => [q.id, q]));
  const rows = attempt.items.map(item => {
    const question = byId.get(item.questionId);
    if (!question) throw new Error('Question is missing from this bank.');
    const selectedId = attempt.answers[question.id] ?? null;
    return { question, selectedId, correct: selectedId === question.correctOptionId };
  });
  const correct = rows.filter(row => row.correct).length;
  const topics: TopicScore[] = TOPICS.map(topic => {
    const subset = rows.filter(row => row.question.topicId === topic.id);
    const topicCorrect = subset.filter(row => row.correct).length;
    return { topicId: topic.id, asked: subset.length, correct: topicCorrect, percent: subset.length ? Math.round(topicCorrect / subset.length * 100) : 0 };
  });
  return { rows, correct, total: rows.length, percent: rows.length ? Math.round(correct / rows.length * 100) : 0, topics };
}

export function finishAttempt(attempt: Attempt): Attempt {
  if (attempt.items.length !== SESSION_SIZE || answeredCount(attempt) !== SESSION_SIZE) throw new Error(`Answer all ${SESSION_SIZE} questions before finishing.`);
  return { ...attempt, finishedAt: new Date().toISOString() };
}

/** Earlier banks used different questions and a 15-item diagnostic. */
export const COMPATIBLE_BANK_VERSIONS: string[] = [];

export function restoreAttempt(raw: string | null, bank: Bank, acceptVersions: readonly string[] = []): Attempt | null {
  if (!raw) return null;
  try {
    const a = JSON.parse(raw) as Attempt;
    if (!a || (a.bankVersion !== bank.bankVersion && !acceptVersions.includes(a.bankVersion)) || typeof a.id !== 'string' || a.id.length > 80 || typeof a.name !== 'string' || a.name.length > 80) return null;
    if (typeof a.startedAt !== 'string' || !Number.isFinite(Date.parse(a.startedAt))) return null;
    if (a.finishedAt !== null && (typeof a.finishedAt !== 'string' || !Number.isFinite(Date.parse(a.finishedAt)))) return null;
    if (!Array.isArray(a.items) || a.items.length !== SESSION_SIZE || new Set(a.items.map(item => item.questionId)).size !== SESSION_SIZE) return null;
    if (!Number.isInteger(a.cursor) || a.cursor < 0 || a.cursor >= SESSION_SIZE) return null;
    if (!a.answers || typeof a.answers !== 'object' || Array.isArray(a.answers) || !Array.isArray(a.flagged)) return null;
    const questionMap = new Map(bank.questions.map(q => [q.id, q]));
    const counts = new Map<string, number>();
    for (const item of a.items) {
      const q = questionMap.get(item.questionId);
      if (!q || q.pool !== 'diagnostic' || !Array.isArray(item.optionIds) || item.optionIds.length !== q.options.length || new Set(item.optionIds).size !== q.options.length || item.optionIds.some(id => !q.options.some(o => o.id === id))) return null;
      counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
    }
    if (TOPICS.some(t => ![1, 2].includes(counts.get(t.id) ?? 0))) return null;
    for (const [id, optionId] of Object.entries(a.answers)) {
      if (!a.items.some(item => item.questionId === id) || !questionMap.get(id)?.options.some(o => o.id === optionId)) return null;
    }
    if (new Set(a.flagged).size !== a.flagged.length || a.flagged.some(id => !a.items.some(item => item.questionId === id))) return null;
    if (a.finishedAt && answeredCount(a) !== SESSION_SIZE) return null;
    return { ...a, bankVersion: bank.bankVersion };
  } catch { return null; }
}
