'use client';

import Link from 'next/link';
import { ArrowUpRight, BookOpen, Check, ClipboardCheck, Clock, Download, Play } from 'lucide-react';
import { useLearner } from './LearnerProvider';
import { BackLink, Loading, StatusStamp, TopicIcon, usePageFocus } from './ui';
import { PERSONAS, glossaryByTerm, isTopicId, lessonPath, moduleById, modulePath } from '../lib/content';
import { completedLessonIds, isMastered } from '../lib/learner';
import { formatMinutes } from '../lib/plan';
import { topicById } from '../lib/topics';
import { BANK } from '../lib/bank';

export function ModulePage({ moduleId }: { moduleId: string }) {
  const { state, hydrated } = useLearner();
  usePageFocus(moduleId);
  const module = moduleById(moduleId);
  if (!module) return <section className="empty-state paper"><h1 tabIndex={-1} data-page-heading>Module not found.</h1><Link className="button primary" href="/course/">Course map</Link></section>;
  if (!hydrated) return <Loading />;
  const topic = isTopicId(module.id) ? topicById(module.id) : null;
  const entry = topic && state.plan ? state.plan[topic.id] : null;
  const mastered = topic ? isMastered(state, topic.id) : false;
  const completed = completedLessonIds(state);
  const startAt = new Set(entry?.startAt ?? []);
  const checkRecord = topic ? state.checks[topic.id] : undefined;
  const checkPool = topic ? BANK.questions.filter(q => q.topicId === topic.id && q.pool === 'check').length : 0;
  const terms = [...new Set(module.lessons.flatMap(l => l.glossary))].map(glossaryByTerm).filter(g => g !== undefined);
  const personaMatch = state.persona && module.scenario.persona.includes(state.persona);
  return <div className="module-page">
    <BackLink href="/course/">Course map</BackLink>
    <header className={`module-hero paper ${topic?.color ?? ''}`}>
      <div className="module-hero-copy">
        <p className="eyebrow"><TopicIcon name={topic?.icon ?? 'award'} size={16} />Module {module.order}{module.sections.length ? ` · Framework §${module.sections.join(', ')}` : ''}</p>
        <h1 tabIndex={-1} data-page-heading>{module.title}</h1>
        <div className="module-meta">{mastered ? <StatusStamp status="mastered" /> : entry ? <StatusStamp status={entry.known ? 'known' : entry.status} /> : !module.assessed ? <span className="small-tag">Not assessed</span> : null}<span><Clock size={14} aria-hidden="true" />{formatMinutes(module.minutes)}</span><span>{module.lessons.length} lessons</span>{module.assessed && <span>5-question check</span>}</div>
        {entry && entry.reasons.length > 0 && <ul className="plan-reasons module-reasons">{entry.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      </div>
      <div className="module-scenario">
        <p className="eyebrow">Scenario{personaMatch ? ` · for ${PERSONAS.find(p => p.id === state.persona)?.label.toLowerCase()}s like you` : ''}</p>
        <h2>{module.scenario.title}</h2>
        <p>{module.scenario.intro}</p>
      </div>
    </header>
    <div className="module-body">
      <section className="module-lessons" aria-labelledby="lessons-heading">
        <div className="section-heading"><div><p className="eyebrow">Lessons</p><h2 id="lessons-heading">Three to six minutes each.</h2></div>{module.assessed && <Link className="button primary" href={`${modulePath(module.id)}check/`}><ClipboardCheck size={18} aria-hidden="true" />{mastered ? 'Retake the check' : 'Take the mastery check'}</Link>}</div>
        <ol className="lesson-list">{module.lessons.map(lesson => {
          const done = completed.has(lesson.id);
          const marked = startAt.has(lesson.id);
          const optional = entry && entry.status === 'review' && !marked && !done;
          return <li key={lesson.id} className={`lesson-row paper ${done ? 'done' : ''} ${marked ? 'start-at' : ''}`}>
            <span className="lesson-num" aria-hidden="true">{lesson.id.replace('L', '')}</span>
            <div className="lesson-row-copy"><Link href={lessonPath(lesson)} className="lesson-link">{lesson.title}</Link><span className="lesson-row-meta">{lesson.minutes} min · {lesson.objectiveIds.map(id => module.objectives.find(o => o.id === id)?.bloom).filter(Boolean).join(', ')}{marked && <strong className="start-marker">Start at</strong>}{optional && <em className="optional-marker">Optional for you</em>}</span></div>
            <span className="lesson-row-state">{done ? <><Check size={16} aria-hidden="true" />Done</> : <><Play size={14} aria-hidden="true" />Open</>}</span>
          </li>;
        })}</ol>
        {module.assessed && <div className="check-callout paper">
          <ClipboardCheck size={26} aria-hidden="true" />
          <div><strong>Mastery check: 5 questions drawn from a pool of {checkPool}, 4 of 5 to pass.</strong><p>Always available. Watching lessons is never required. Pass it to mark this module as mastered and remove it from your plan.{checkRecord?.attempts.length ? ` Attempts so far: ${checkRecord.attempts.length}.` : ''}</p></div>
          <Link className="button secondary" href={`${modulePath(module.id)}check/`}>Open the check<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>}
      </section>
      <aside className="module-side">
        <div className="paper side-card"><p className="eyebrow">Objectives</p><ol className="objective-list">{module.objectives.map(o => <li key={o.id}><span>{o.text}</span><em>{o.bloom}</em></li>)}</ol></div>
        {terms.length > 0 && <div className="paper side-card"><p className="eyebrow">Glossary cards</p><dl className="glossary-list">{terms.map(t => <div key={t.term}><dt>{t.term}</dt><dd>{t.definition} <span className="micro">§{t.section}</span></dd></div>)}</dl></div>}
        <div className="paper side-card source-card"><BookOpen size={20} aria-hidden="true" /><p>Read the source: CIMMYT MEAL Framework 2026–2030, sections {module.sections.join(', ')}.</p><a className="text-button" download href="/cimmyt-meal-framework-2026-2030.docx"><Download size={15} aria-hidden="true" />Download the framework (.docx)</a></div>
      </aside>
    </div>
  </div>;
}
