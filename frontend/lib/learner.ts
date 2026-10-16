import { TOPICS } from './topics.ts';
import type { TopicId } from './topics.ts';
import { COMPATIBLE_BANK_VERSIONS, restoreAttempt } from './assessment.ts';
import type { Attempt, Bank } from './assessment.ts';
import { restoreCheck } from './checks.ts';
import type { CheckAttempt } from './checks.ts';
import { STATUS_ORDER } from './plan.ts';
import type { Confidence, Plan, PlanEntry } from './plan.ts';
import type { Persona } from './content.ts';

// ---------------------------------------------------------------------------
// Learner state v2 (spec 6.7). Everything stays in the browser. Restoration is
// defensive: any damaged field discards the whole record, as restoreAttempt does.
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'cimmyt-meal-learner-v2';
export const LEGACY_STORAGE_KEY = 'cimmyt-meal-assessment-v1';
export const PERSONA_IDS: Persona[] = ['project-lead', 'field-officer', 'scientist', 'meal-specialist', 'partner-liaison'];

export type LessonRecord = { opened: string; completed?: string; rating?: 'clear' | 'unclear' };
export type CheckRecord = { attempts: CheckAttempt[]; masteredAt?: string; lastRecheckAt?: string };
export type LearnerState = {
  version: 2;
  bankVersion: string;
  name: string;
  persona?: Persona;
  diagnostic: Attempt | null;
  confidence: Record<string, Confidence>;
  plan: Plan | null;
  lessons: Record<string, LessonRecord>;
  checks: Partial<Record<TopicId, CheckRecord>>;
  seenQuestionIds: string[];
  capstone?: { completedAt: string; choices: Record<string, string> };
  activeCheck?: CheckAttempt | null;
};

export function emptyLearner(bank: Bank): LearnerState {
  return { version: 2, bankVersion: bank.bankVersion, name: '', diagnostic: null, confidence: {}, plan: null, lessons: {}, checks: {}, seenQuestionIds: [], activeCheck: null };
}

/** A v1 record is the attempt itself; it becomes the diagnostic of a fresh v2 state. */
export function migrateV1(rawAttempt: string | null, bank: Bank): LearnerState | null {
  const attempt = restoreAttempt(rawAttempt, bank, COMPATIBLE_BANK_VERSIONS);
  if (!attempt) return null;
  const state = emptyLearner(bank);
  state.name = attempt.name;
  state.diagnostic = attempt;
  state.seenQuestionIds = attempt.items.map(i => i.questionId);
  return state;
}

const isIso = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

function validPlan(raw: unknown, lessonIds: Set<string>): raw is Plan {
  if (!isRecord(raw)) return false;
  const keys = Object.keys(raw);
  if (keys.length !== TOPICS.length || TOPICS.some(t => !(t.id in raw))) return false;
  for (const entry of Object.values(raw) as PlanEntry[]) {
    if (!isRecord(entry) || !STATUS_ORDER.includes(entry.status) || !Array.isArray(entry.reasons) || !entry.reasons.every(r => typeof r === 'string')) return false;
    if (!Array.isArray(entry.startAt) || entry.startAt.some(id => typeof id !== 'string' || !lessonIds.has(id))) return false;
    if (typeof entry.gap !== 'number' || !Number.isFinite(entry.gap) || entry.gap < 0 || !isIso(entry.updatedAt)) return false;
    if (entry.known !== undefined && typeof entry.known !== 'boolean') return false;
  }
  return true;
}

/** Validates a parsed v2 object. Returns null for anything damaged, outdated or foreign. */
export function validateLearner(raw: unknown, bank: Bank, lessonIds: Set<string>): LearnerState | null {
  try {
    if (!isRecord(raw)) return null;
    const s = raw as LearnerState;
    if (s.version !== 2 || s.bankVersion !== bank.bankVersion) return null;
    if (typeof s.name !== 'string' || s.name.length > 80) return null;
    if (s.persona !== undefined && !PERSONA_IDS.includes(s.persona)) return null;
    const diagnostic = s.diagnostic === null ? null : restoreAttempt(JSON.stringify(s.diagnostic), bank);
    if (s.diagnostic !== null && !diagnostic) return null;
    if (!isRecord(s.confidence)) return null;
    for (const [id, c] of Object.entries(s.confidence)) if (!diagnostic?.items.some(i => i.questionId === id) || !['sure', 'unsure'].includes(c as string)) return null;
    if (s.plan !== null && !validPlan(s.plan, lessonIds)) return null;
    if (s.plan && !diagnostic) return null;
    if (!isRecord(s.lessons)) return null;
    for (const [id, rec] of Object.entries(s.lessons)) {
      if (!lessonIds.has(id) || !isRecord(rec) || !isIso(rec.opened)) return null;
      if (rec.completed !== undefined && !isIso(rec.completed)) return null;
      if (rec.rating !== undefined && !['clear', 'unclear'].includes(rec.rating as string)) return null;
    }
    if (!isRecord(s.checks)) return null;
    const bankIds = new Set(bank.questions.map(q => q.id));
    const checks: Partial<Record<TopicId, CheckRecord>> = {};
    for (const [topicId, rec] of Object.entries(s.checks)) {
      if (!TOPICS.some(t => t.id === topicId) || !isRecord(rec) || !Array.isArray(rec.attempts)) return null;
      const attempts: CheckAttempt[] = [];
      for (const a of rec.attempts) {
        const restored = restoreCheck(a, bank);
        if (!restored || restored.topicId !== topicId || !restored.finishedAt) return null;
        attempts.push(restored);
      }
      if (rec.masteredAt !== undefined && !isIso(rec.masteredAt)) return null;
      if (rec.lastRecheckAt !== undefined && !isIso(rec.lastRecheckAt)) return null;
      checks[topicId as TopicId] = { attempts, ...(rec.masteredAt !== undefined ? { masteredAt: rec.masteredAt } : {}), ...(rec.lastRecheckAt !== undefined ? { lastRecheckAt: rec.lastRecheckAt } : {}) };
    }
    if (!Array.isArray(s.seenQuestionIds) || s.seenQuestionIds.some(id => typeof id !== 'string' || !bankIds.has(id)) || new Set(s.seenQuestionIds).size !== s.seenQuestionIds.length) return null;
    if (s.capstone !== undefined) {
      if (!isRecord(s.capstone) || !isIso(s.capstone.completedAt) || !isRecord(s.capstone.choices)) return null;
      for (const v of Object.values(s.capstone.choices)) if (typeof v !== 'string') return null;
    }
    let activeCheck: CheckAttempt | null = null;
    if (s.activeCheck) {
      activeCheck = restoreCheck(s.activeCheck, bank);
      if (!activeCheck || activeCheck.finishedAt) return null;
    }
    return { version: 2, bankVersion: s.bankVersion, name: s.name, ...(s.persona !== undefined ? { persona: s.persona } : {}), diagnostic, confidence: { ...s.confidence }, plan: s.plan, lessons: { ...s.lessons }, checks, seenQuestionIds: [...s.seenQuestionIds], ...(s.capstone !== undefined ? { capstone: s.capstone } : {}), activeCheck };
  } catch { return null; }
}

/** Restores v2 state, falling back to a v1 attempt when no v2 record exists. */
export function restoreLearner(rawV2: string | null, rawV1: string | null, bank: Bank, lessonIds: Set<string>): LearnerState | null {
  if (rawV2) {
    try { return validateLearner(JSON.parse(rawV2), bank, lessonIds); } catch { return null; }
  }
  return migrateV1(rawV1, bank);
}

export function exportLearner(state: LearnerState): string {
  return JSON.stringify({ ...state, activeCheck: null, exportedAt: new Date().toISOString(), app: 'cimmyt-meal-course' }, null, 2);
}

export function importLearner(raw: string, bank: Bank, lessonIds: Set<string>): LearnerState | null {
  try { return validateLearner(JSON.parse(raw), bank, lessonIds); } catch { return null; }
}

// --- small reducers used by the UI -----------------------------------------

export function withSeen(state: LearnerState, ids: readonly string[]): LearnerState {
  const seen = state.seenQuestionIds.filter(id => !ids.includes(id));
  return { ...state, seenQuestionIds: [...seen, ...ids] };
}

export function recordLessonOpened(state: LearnerState, lessonId: string, now = new Date().toISOString()): LearnerState {
  if (state.lessons[lessonId]) return state;
  return { ...state, lessons: { ...state.lessons, [lessonId]: { opened: now } } };
}

export function recordLessonCompleted(state: LearnerState, lessonId: string, now = new Date().toISOString()): LearnerState {
  const current = state.lessons[lessonId] ?? { opened: now };
  return { ...state, lessons: { ...state.lessons, [lessonId]: { ...current, completed: current.completed ?? now } } };
}

export function rateLesson(state: LearnerState, lessonId: string, rating: 'clear' | 'unclear', now = new Date().toISOString()): LearnerState {
  const current = state.lessons[lessonId] ?? { opened: now };
  return { ...state, lessons: { ...state.lessons, [lessonId]: { ...current, rating } } };
}

export const completedLessonIds = (state: LearnerState | null) => new Set(Object.entries(state?.lessons ?? {}).filter(([, r]) => r.completed).map(([id]) => id));
export const masteredCount = (state: LearnerState | null) => Object.values(state?.checks ?? {}).filter(c => c?.masteredAt).length;
export const isMastered = (state: LearnerState | null, topicId: TopicId) => Boolean(state?.checks[topicId]?.masteredAt);
export const allMastered = (state: LearnerState | null) => masteredCount(state) === TOPICS.length;
