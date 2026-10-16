import { TOPICS } from './topics.ts';
import type { TopicId } from './topics.ts';
import { scoreAttempt } from './assessment.ts';
import type { Attempt, Bank, Question } from './assessment.ts';
import type { Lesson, Misconception, Module } from './content.ts';

// ---------------------------------------------------------------------------
// Plan engine: turns a scored diagnostic plus confidence taps into a personal
// study plan. Pure functions; content and bank are passed in so tests can use
// fixtures. Rules follow course-spec.md section 6.
// ---------------------------------------------------------------------------

export type Confidence = 'sure' | 'unsure';
export type Status = 'start-here' | 'review' | 'check-first' | 'looking-good' | 'mastered';
export type PlanEntry = { status: Status; reasons: string[]; startAt: string[]; gap: number; updatedAt: string; known?: boolean };
export type Plan = Record<TopicId, PlanEntry>;

export const STATUS_LABEL: Record<Status, string> = { 'start-here': 'Start here', review: 'Review', 'check-first': 'Check first', 'looking-good': 'Looking good', mastered: 'Mastered' };
export const STATUS_ORDER: Status[] = ['start-here', 'review', 'check-first', 'looking-good', 'mastered'];
export const MISS_WEIGHT = { foundation: 1.5, applied: 1.0, advanced: 0.7 } as const;
export const CONFIDENT_MISS_WEIGHT = 0.5;

export type TopicSignals = { asked: number; correct: number; foundationMiss: boolean; confidentMiss: boolean; unsureCorrect: boolean; gap: number; missed: { question: Question; selectedId: string | null; confident: boolean }[] };

export function topicSignals(bank: Bank, attempt: Attempt, confidence: Record<string, Confidence>): Record<TopicId, TopicSignals> {
  const result = scoreAttempt(bank, attempt);
  const out = {} as Record<TopicId, TopicSignals>;
  for (const topic of TOPICS) {
    const rows = result.rows.filter(r => r.question.topicId === topic.id);
    const signals: TopicSignals = { asked: rows.length, correct: 0, foundationMiss: false, confidentMiss: false, unsureCorrect: false, gap: 0, missed: [] };
    for (const row of rows) {
      const sure = (confidence[row.question.id] ?? 'sure') === 'sure';
      if (row.correct) {
        signals.correct++;
        if (!sure) signals.unsureCorrect = true;
      } else {
        if (row.question.difficulty === 'foundation') signals.foundationMiss = true;
        if (sure) signals.confidentMiss = true;
        signals.gap += MISS_WEIGHT[row.question.difficulty] + (sure ? CONFIDENT_MISS_WEIGHT : 0);
        signals.missed.push({ question: row.question, selectedId: row.selectedId, confident: sure });
      }
    }
    signals.gap = Math.round(signals.gap * 10) / 10;
    out[topic.id] = signals;
  }
  return out;
}

/** Status rules applied in order (spec 6.2). A topic with only unsure-correct answers is "check first" however many items were asked. */
export function statusFor(s: Pick<TopicSignals, 'asked' | 'correct' | 'foundationMiss' | 'confidentMiss' | 'unsureCorrect'>): Status {
  if (s.foundationMiss || s.correct === 0) return 'start-here';
  if (s.correct < s.asked || s.confidentMiss) return 'review';
  if (s.unsureCorrect) return 'check-first';
  return 'looking-good';
}

export type Targeting = { startAt: Lesson[]; misconceptions: { tag: string; description: string; lessons: Lesson[] }[] };

/** Lesson-level targeting for a set of missed items (spec 6.3). */
export function targetLessons(missed: { question: Question; selectedId: string | null }[], modules: Module[], misconceptions: Misconception[]): Targeting {
  const lessons = modules.flatMap(m => m.lessons);
  const byTag = new Map(misconceptions.map(m => [m.tag, m]));
  const startAt = new Map<string, Lesson>();
  const found = new Map<string, { tag: string; description: string; lessons: Lesson[] }>();
  for (const miss of missed) {
    const objectives = new Set(miss.question.objectiveIds ?? []);
    for (const lesson of lessons) if (lesson.objectiveIds.some(id => objectives.has(id))) startAt.set(lesson.id, lesson);
    const tag = miss.selectedId ? miss.question.misconceptions?.[miss.selectedId] : undefined;
    const misconception = tag ? byTag.get(tag) : undefined;
    if (misconception && !found.has(misconception.tag)) {
      const remedy = misconception.remedyLessonIds.map(id => lessons.find(l => l.id === id)).filter((l): l is Lesson => Boolean(l));
      for (const lesson of remedy) startAt.set(lesson.id, lesson);
      found.set(misconception.tag, { tag: misconception.tag, description: misconception.description, lessons: remedy });
    }
  }
  const order = new Map(lessons.map((l, i) => [l.id, i]));
  return { startAt: [...startAt.values()].sort((a, b) => order.get(a.id)! - order.get(b.id)!), misconceptions: [...found.values()] };
}

function reasonsFor(status: Status, signals: TopicSignals, targeting: Targeting, module: Module | undefined): string[] {
  const reasons: string[] = [];
  const first = targeting.startAt.find(l => l.moduleId === module?.id);
  switch (status) {
    case 'start-here':
      reasons.push(signals.foundationMiss ? 'Take the full module. A foundation question was missed.' : 'Take the full module. No diagnostic question in this topic was answered correctly.');
      break;
    case 'review':
      reasons.push(first ? `Start at lesson ${first.id.replace('L', '')}, ${first.title}.` : 'Start with the lessons marked for you.');
      if (signals.confidentMiss) reasons.push('One answer was confidently wrong, which usually points at a mix-up rather than a gap.');
      break;
    case 'check-first':
      reasons.push('You were right but not sure. Take the 5-question check; study only if needed.');
      break;
    case 'looking-good':
      reasons.push('Optional. Take the check whenever you want the module marked as mastered.');
      break;
    case 'mastered':
      reasons.push('Mastered. A spaced refresher will be offered later.');
      break;
  }
  for (const m of targeting.misconceptions) reasons.push(m.description);
  return reasons;
}

export function buildPlan(bank: Bank, attempt: Attempt, confidence: Record<string, Confidence>, modules: Module[], misconceptions: Misconception[], now = new Date().toISOString()): Plan {
  const signals = topicSignals(bank, attempt, confidence);
  const plan = {} as Plan;
  for (const topic of TOPICS) {
    const s = signals[topic.id];
    const status = statusFor(s);
    const targeting = targetLessons(s.missed, modules, misconceptions);
    const module = modules.find(m => m.id === topic.id);
    const startAt = targeting.startAt.filter(l => l.moduleId === topic.id).map(l => l.id);
    plan[topic.id] = { status, reasons: reasonsFor(status, s, targeting, module), startAt: status === 'start-here' ? (module?.lessons[0] ? [module.lessons[0].id] : []) : startAt, gap: s.gap, updatedAt: now };
  }
  return plan;
}

/** Ordered list of topics for the plan: status band first, then gap score, then module order. */
export function orderPlan(plan: Plan, modules: Module[]): TopicId[] {
  const order = new Map(modules.map(m => [m.id, m.order]));
  const band = (s: Status) => STATUS_ORDER.indexOf(s);
  return (Object.keys(plan) as TopicId[]).sort((a, b) => band(plan[a].status) - band(plan[b].status) || plan[b].gap - plan[a].gap || (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

export const CHECK_MINUTES = 5;

/** Estimated minutes to close the gaps in a plan entry. */
export function entryMinutes(entry: PlanEntry, module: Module | undefined): number {
  if (!module) return 0;
  switch (entry.status) {
    case 'start-here': return module.minutes;
    case 'review': {
      const lessons = module.lessons.filter(l => entry.startAt.includes(l.id));
      return (lessons.length ? lessons : module.lessons).reduce((n, l) => n + l.minutes, 0) + CHECK_MINUTES;
    }
    case 'check-first': return CHECK_MINUTES;
    default: return 0;
  }
}

export function planMinutes(plan: Plan, modules: Module[]): number {
  return (Object.keys(plan) as TopicId[]).reduce((n, id) => n + entryMinutes(plan[id], modules.find(m => m.id === id)), 0);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 1) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const needsStudy = (status: Status) => status === 'start-here' || status === 'review';

export function markKnown(plan: Plan, topicId: TopicId, now = new Date().toISOString()): Plan {
  return { ...plan, [topicId]: { ...plan[topicId], status: 'looking-good', known: true, reasons: ['Marked as known by you. Take the check whenever you want the module marked as mastered.'], startAt: [], updatedAt: now } };
}

export function markMastered(plan: Plan, topicId: TopicId, now = new Date().toISOString()): Plan {
  return { ...plan, [topicId]: { ...plan[topicId], status: 'mastered', reasons: ['Mastered. A spaced refresher will be offered later.'], startAt: [], updatedAt: now } };
}

/** After a failed check: list the lessons for the missed objectives. Never downgrades a module to "start here". */
export function applyCheckFailure(plan: Plan, topicId: TopicId, missedObjectiveIds: string[], modules: Module[], now = new Date().toISOString()): Plan {
  const module = modules.find(m => m.id === topicId);
  const wanted = new Set(missedObjectiveIds);
  const startAt = module ? module.lessons.filter(l => l.objectiveIds.some(id => wanted.has(id))).map(l => l.id) : [];
  const first = module?.lessons.find(l => startAt.includes(l.id));
  const current = plan[topicId];
  const status: Status = current.status === 'start-here' ? 'start-here' : 'review';
  return { ...plan, [topicId]: { ...current, status, known: false, startAt, reasons: [first ? `Check not passed yet. Open lesson ${first.id.replace('L', '')}, ${first.title}, then retry with a fresh draw.` : 'Check not passed yet. Revisit the lessons, then retry with a fresh draw.'], updatedAt: now } };
}

/** Failing a spaced re-check moves the module to "Review" (never back to "Start here"). */
export function applyRecheckFailure(plan: Plan, topicId: TopicId, missedObjectiveIds: string[], modules: Module[], now = new Date().toISOString()): Plan {
  const module = modules.find(m => m.id === topicId);
  const wanted = new Set(missedObjectiveIds);
  const startAt = module ? module.lessons.filter(l => l.objectiveIds.some(id => wanted.has(id))).map(l => l.id) : [];
  return { ...plan, [topicId]: { ...plan[topicId], status: 'review', known: false, startAt, reasons: ['A refresher question was missed. Review the lessons marked for you and retake the check.'], updatedAt: now } };
}

/** The lesson the plan would send a learner to next, following the plan rather than module order. */
export function nextForYou(plan: Plan | null, modules: Module[], completedLessonIds: Set<string>, currentLessonId?: string): Lesson | null {
  if (!plan) return null;
  for (const topicId of orderPlan(plan, modules)) {
    const entry = plan[topicId];
    if (!needsStudy(entry.status)) continue;
    const module = modules.find(m => m.id === topicId);
    if (!module) continue;
    const candidates = entry.status === 'start-here' ? module.lessons : module.lessons.filter(l => entry.startAt.includes(l.id));
    const next = candidates.find(l => !completedLessonIds.has(l.id) && l.id !== currentLessonId);
    if (next) return next;
  }
  return null;
}
