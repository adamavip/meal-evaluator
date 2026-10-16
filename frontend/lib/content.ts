import { TOPICS } from './topics.ts';
import type { TopicId } from './topics.ts';
import orientation from '../content/modules/orientation.json';
import mealFoundations from '../content/modules/meal-foundations.json';
import theoryOfChange from '../content/modules/theory-of-change.json';
import resultsFramework from '../content/modules/results-framework.json';
import kpisMeasurement from '../content/modules/kpis-measurement.json';
import evidenceSystems from '../content/modules/evidence-systems.json';
import impactAssessment from '../content/modules/impact-assessment.json';
import learningAdaptation from '../content/modules/learning-adaptation.json';
import accountabilityInclusion from '../content/modules/accountability-inclusion.json';
import implementationGovernance from '../content/modules/implementation-governance.json';
import misconceptionData from '../content/misconceptions.json';
import glossaryData from '../content/glossary.json';
import capstoneData from '../content/capstone.json';

// ---------------------------------------------------------------------------
// Content model. Everything the course shows is data in `content/`. Components
// never hold lesson text. See docs/content-authoring.md for the authoring guide.
// ---------------------------------------------------------------------------

export type ModuleId = TopicId | 'orientation';
export type Persona = 'project-lead' | 'field-officer' | 'scientist' | 'meal-specialist' | 'partner-liaison';
export const PERSONAS: { id: Persona; label: string; blurb: string }[] = [
  { id: 'project-lead', label: 'Project lead', blurb: 'PI or project manager. You need proposal-stage requirements, the minimum package, budgets and who owns what.' },
  { id: 'field-officer', label: 'Field or data officer', blurb: 'Enumerator lead or data manager. You need the evidence stack, the journey of one observation, identifiers and offline work.' },
  { id: 'scientist', label: 'Scientist', blurb: 'Breeder, agronomist or economist. You need the case for observation-level evidence, contribution versus attribution and measurement levels.' },
  { id: 'meal-specialist', label: 'MEAL specialist', blurb: 'Institutional or regional MEAL staff. You need fast confirmation and the governance and roadmap detail.' },
  { id: 'partner-liaison', label: 'Partner or donor liaison', blurb: 'Communications or partnerships. You need accountability directions, collect-once reporting and the 2030 ambition.' },
];
export type Bloom = 'remember' | 'understand' | 'apply' | 'analyse';
export type Tone = 'green' | 'gold' | 'sky' | 'ink' | 'paper';

export type Objective = { id: string; text: string; bloom: Bloom };

// Scene DSL for the storyboard player. One scene per frame; the player animates
// the entry of each scene using the motion primitives from the spec (slab in,
// connect, stack, split, dim and spotlight, count up, stamp, sort).
export type Scene =
  | { kind: 'title'; title: string; subtitle?: string; stamp?: string }
  | { kind: 'cards'; items: { label: string; detail?: string; tone?: Tone }[]; spotlight?: number[]; stamp?: string; layout?: 'row' | 'grid' }
  | { kind: 'chain'; steps: { label: string; detail?: string; tone?: Tone }[]; links?: { label?: string; broken?: boolean }[]; spotlight?: number; traveler?: boolean; stamp?: string }
  | { kind: 'stack'; layers: { label: string; detail?: string; tone?: Tone }[]; spotlight?: number; traveler?: boolean; stamp?: string }
  | { kind: 'sort'; bins: string[]; cards: { label: string; bin: number; wrong?: number }[]; stamp?: string }
  | { kind: 'split'; left: { title: string; lines: string[]; value?: number; tone?: Tone }; right: { title: string; lines: string[]; value?: number; tone?: Tone }; gap?: string; noise?: boolean }
  | { kind: 'dial'; segments: string[]; value: number; label?: string; flagged?: number[] }
  | { kind: 'fan'; source: string; branches: { label: string; detail?: string }[]; target: string }
  | { kind: 'compass'; directions: { label: string; detail?: string }[]; active?: number[] }
  | { kind: 'grid'; rows: string[]; cols: string[]; cells?: string[][]; token?: { row: number; col: number; label?: string }; counter?: { label: string; value: number } }
  | { kind: 'loop'; steps: { label: string; detail?: string }[]; active?: number; log?: string }
  | { kind: 'counter'; items: { label: string; value: number; prefix?: string; suffix?: string; tone?: Tone }[]; note?: string }
  | { kind: 'dissolve'; from: string[]; to: { label: string; dots: number } }
  | { kind: 'checklist'; items: { label: string; done?: boolean }[]; stamp?: string };

export type Frame = { id: string; seconds: number; narration: string; scene: Scene };
export type Storyboard = { id: string; title: string; frames: Frame[] };

export type Widget =
  | { widget: 'sorter'; prompt: string; bins: { id: string; label: string; hint?: string }[]; cards: { label: string; bin: string; why: string }[] }
  | { widget: 'order'; prompt: string; items: { label: string; detail?: string }[]; why: string }
  | { widget: 'branch'; prompt: string; start: string; nodes: Record<string, BranchNode> }
  | { widget: 'dial'; prompt: string; dimensions: { label: string; problem: string; fix: string }[] }
  | { widget: 'matrix'; prompt: string }
  | { widget: 'budget'; prompt: string }
  | { widget: 'persona'; prompt: string };
export type BranchNode = { text: string; choices?: { label: string; next: string; feedback: string; good?: boolean }[]; end?: boolean; moduleId?: ModuleId; lessonId?: string };

export type Lesson = {
  id: string;
  moduleId: ModuleId;
  title: string;
  objectiveIds: string[];
  minutes: number;
  beats: {
    hook: string;
    explainer: { kind: 'storyboard' | 'video'; storyboardId: string; src?: string; poster?: string; captions?: string };
    example: { kind: 'text'; title: string; body: string[] } | ({ kind: 'interactive'; title: string } & Widget);
    microCheck: string[];
    recap: { bullets: string[]; source: { section: string; title: string } };
  };
  glossary: string[];
};

export type Module = {
  id: ModuleId;
  order: number;
  title: string;
  short: string;
  minutes: number;
  sections: string[];
  scenario: { title: string; intro: string; persona: Persona[] };
  objectives: Objective[];
  lessons: Lesson[];
  storyboards: Storyboard[];
  prerequisites: ModuleId[];
  assessed: boolean;
};

export type Misconception = { tag: string; description: string; remedyLessonIds: string[] };
export type GlossaryEntry = { term: string; definition: string; section: string };
export type CapstoneDecision = { id: string; moduleId: TopicId; lessonId: string; title: string; situation: string; choices: { id: string; label: string; good: boolean; consequence: string }[] };
export type Capstone = { title: string; intro: string; project: { name: string; summary: string }; decisions: CapstoneDecision[]; closing: string };

const CONTENT_MODULES = [orientation, mealFoundations, theoryOfChange, resultsFramework, kpisMeasurement, evidenceSystems, impactAssessment, learningAdaptation, accountabilityInclusion, implementationGovernance] as unknown as Module[];

export const MODULES: Module[] = [...CONTENT_MODULES].sort((a, b) => a.order - b.order);
export const COURSE_MODULES: Module[] = MODULES.filter(m => m.assessed);
export const MISCONCEPTIONS: Misconception[] = misconceptionData as Misconception[];
export const GLOSSARY: GlossaryEntry[] = glossaryData as GlossaryEntry[];
export const CAPSTONE: Capstone = capstoneData as Capstone;
export const LESSONS: Lesson[] = MODULES.flatMap(m => m.lessons);
export const COURSE_MINUTES = MODULES.reduce((n, m) => n + m.minutes, 0) + 20;

const moduleMap = new Map(MODULES.map(m => [m.id, m]));
const lessonMap = new Map(LESSONS.map(l => [l.id, l]));
const storyboardMap = new Map(MODULES.flatMap(m => m.storyboards.map(s => [s.id, s] as const)));
const misconceptionMap = new Map(MISCONCEPTIONS.map(m => [m.tag, m]));
const glossaryMap = new Map(GLOSSARY.map(g => [g.term.toLowerCase(), g]));

export const moduleById = (id: string): Module | undefined => moduleMap.get(id as ModuleId);
export const lessonById = (id: string): Lesson | undefined => lessonMap.get(id);
export const storyboardById = (id: string): Storyboard | undefined => storyboardMap.get(id);
export const misconceptionByTag = (tag: string): Misconception | undefined => misconceptionMap.get(tag);
export const glossaryByTerm = (term: string): GlossaryEntry | undefined => glossaryMap.get(term.toLowerCase());
export const isTopicId = (id: string): id is TopicId => TOPICS.some(t => t.id === id);

/** URL-safe lesson slug: "L3.2" -> "l3-2". */
export const lessonSlug = (id: string) => id.toLowerCase().replace(/\./g, '-');
export function lessonFromSlug(moduleId: string, slug: string): Lesson | undefined {
  const mod = moduleById(moduleId);
  return mod?.lessons.find(l => lessonSlug(l.id) === slug.toLowerCase());
}
export const lessonPath = (lesson: Lesson) => `/course/${lesson.moduleId}/${lessonSlug(lesson.id)}/`;
export const modulePath = (moduleId: string) => `/course/${moduleId}/`;

/** Lessons that teach any of the given objectives, in module order. */
export function lessonsForObjectives(objectiveIds: readonly string[]): Lesson[] {
  const wanted = new Set(objectiveIds);
  return LESSONS.filter(l => l.objectiveIds.some(id => wanted.has(id)));
}

export function objectiveById(id: string): Objective | undefined {
  const moduleId = id.split('.')[0];
  return moduleById(moduleId)?.objectives.find(o => o.id === id);
}

export function nextLessonInModule(lesson: Lesson): Lesson | null {
  const mod = moduleById(lesson.moduleId)!;
  const index = mod.lessons.findIndex(l => l.id === lesson.id);
  return mod.lessons[index + 1] ?? null;
}
export function previousLessonInModule(lesson: Lesson): Lesson | null {
  const mod = moduleById(lesson.moduleId)!;
  const index = mod.lessons.findIndex(l => l.id === lesson.id);
  return index > 0 ? mod.lessons[index - 1] : null;
}

export function transcript(storyboard: Storyboard): string[] {
  return storyboard.frames.map(f => f.narration);
}
