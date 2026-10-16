'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ClipboardCheck, Download, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useLearner } from './LearnerProvider';
import { Explainer } from './Explainer';
import { clipsForLesson } from '../lib/audio';
import { MicroCheck } from './MicroCheck';
import { WidgetView } from './Widgets';
import { BackLink, Loading, SectionRef, TopicIcon, usePageFocus } from './ui';
import { COURSE_MODULES, glossaryByTerm, isTopicId, lessonFromSlug, lessonPath, moduleById, modulePath, nextLessonInModule, previousLessonInModule, storyboardById } from '../lib/content';
import { completedLessonIds, rateLesson, recordLessonCompleted, recordLessonOpened } from '../lib/learner';
import { nextForYou } from '../lib/plan';
import { topicById } from '../lib/topics';

export function LessonPage({ moduleId, lessonSlug }: { moduleId: string; lessonSlug: string }) {
  const { state, hydrated, update } = useLearner();
  const module = moduleById(moduleId);
  const lesson = lessonFromSlug(moduleId, lessonSlug);
  usePageFocus(`${moduleId}/${lessonSlug}`);
  useEffect(() => { if (hydrated && lesson) update(s => recordLessonOpened(s, lesson.id)); }, [hydrated, lesson, update]);
  if (!module || !lesson) return <section className="empty-state paper"><h1 tabIndex={-1} data-page-heading>Lesson not found.</h1><Link className="button primary" href="/course/">Course map</Link></section>;
  if (!hydrated) return <Loading />;
  const topic = isTopicId(module.id) ? topicById(module.id) : null;
  const storyboard = storyboardById(lesson.beats.explainer.storyboardId);
  const record = state.lessons[lesson.id];
  const prev = previousLessonInModule(lesson);
  const next = nextLessonInModule(lesson);
  const planNext = nextForYou(state.plan, COURSE_MODULES, new Set([...completedLessonIds(state), lesson.id]), lesson.id);
  const objectives = lesson.objectiveIds.map(id => module.objectives.find(o => o.id === id)).filter(o => o !== undefined);
  const terms = lesson.glossary.map(glossaryByTerm).filter(g => g !== undefined);
  const example = lesson.beats.example;
  return <article className="lesson-page">
    <div className="lesson-topbar"><BackLink href={modulePath(module.id)}>{module.title}</BackLink><span className="micro">Lesson {lesson.id.replace('L', '')} · {lesson.minutes} min</span></div>
    <header className="lesson-header">
      <p className="eyebrow">{topic && <span className={`label-chip ${topic.color}`}><TopicIcon name={topic.icon} size={14} />{module.title}</span>}</p>
      <h1 tabIndex={-1} data-page-heading>{lesson.title}</h1>
      <ul className="lesson-objectives">{objectives.map(o => <li key={o.id}><span className="micro">You will</span>{o.text}</li>)}</ul>
    </header>

    <section className="beat beat-hook" aria-labelledby="beat-hook"><span className="beat-label" id="beat-hook"><i>1</i>Hook</span><p className="hook-text">{lesson.beats.hook}</p></section>

    <section className="beat beat-explainer" aria-labelledby="beat-explainer"><span className="beat-label" id="beat-explainer"><i>2</i>Explainer</span>
      {lesson.beats.explainer.kind === 'video' && lesson.beats.explainer.src ? <div className="video-wrap paper"><video controls preload="metadata" poster={lesson.beats.explainer.poster} src={lesson.beats.explainer.src}>{lesson.beats.explainer.captions && <track kind="captions" srcLang="en" src={lesson.beats.explainer.captions} default />}</video></div> : null}
      {storyboard ? <Explainer storyboard={storyboard} clips={clipsForLesson(lesson, storyboard)} /> : <p>Explainer unavailable.</p>}
    </section>

    <section className="beat beat-example" aria-labelledby="beat-example"><span className="beat-label" id="beat-example"><i>3</i>Worked example</span>
      <div className="example-card paper">
        <h2>{example.title}</h2>
        {example.kind === 'text' ? example.body.map((p, i) => <p key={i}>{p}</p>) : <WidgetView widget={example} />}
      </div>
    </section>

    {lesson.beats.microCheck.length > 0 && <section className="beat beat-check" aria-labelledby="beat-check"><span className="beat-label" id="beat-check"><i>4</i>Micro-check</span><p className="beat-note">Instant feedback. Not scored for mastery.</p><MicroCheck questionIds={lesson.beats.microCheck} /></section>}

    <section className="beat beat-recap" aria-labelledby="beat-recap"><span className="beat-label" id="beat-recap"><i>{lesson.beats.microCheck.length ? 5 : 4}</i>Recap</span>
      <div className="recap-card paper">
        <ul>{lesson.beats.recap.bullets.map((b, i) => <li key={i}><Check size={16} aria-hidden="true" />{b}</li>)}</ul>
        <SectionRef section={lesson.beats.recap.source.section} title={lesson.beats.recap.source.title} />
        <div className="recap-links"><a className="text-button" download href="/cimmyt-meal-framework-2026-2030.docx"><Download size={14} aria-hidden="true" />Read the source (.docx)</a><button type="button" className="text-button no-print" onClick={() => window.print()}><BookOpen size={14} aria-hidden="true" />Print recap</button></div>
      </div>
      {terms.length > 0 && <dl className="glossary-inline">{terms.map(t => <div key={t.term}><dt>{t.term}</dt><dd>{t.definition}</dd></div>)}</dl>}
    </section>

    <section className="lesson-foot paper">
      <div className="lesson-rating" role="group" aria-label="Was this lesson clear?">
        <span>Was this clear?</span>
        <button type="button" className={`icon-button ${record?.rating === 'clear' ? 'active' : ''}`} aria-pressed={record?.rating === 'clear'} aria-label="Yes, clear" onClick={() => update(s => rateLesson(s, lesson.id, 'clear'))}><ThumbsUp size={17} aria-hidden="true" /></button>
        <button type="button" className={`icon-button ${record?.rating === 'unclear' ? 'active' : ''}`} aria-pressed={record?.rating === 'unclear'} aria-label="No, unclear" onClick={() => update(s => rateLesson(s, lesson.id, 'unclear'))}><ThumbsDown size={17} aria-hidden="true" /></button>
        {record?.rating && <span className="micro">Saved locally</span>}
      </div>
      <div className="lesson-nav">
        {prev ? <Link className="button secondary" href={lessonPath(prev)}><ArrowLeft size={17} aria-hidden="true" />Previous</Link> : <span />}
        <button type="button" className={`button ${record?.completed ? 'secondary' : 'primary'}`} onClick={() => update(s => recordLessonCompleted(s, lesson.id))}>{record?.completed ? <><Check size={17} aria-hidden="true" />Marked done</> : 'Mark lesson done'}</button>
        {planNext ? <Link className="button primary" href={lessonPath(planNext)} onClick={() => update(s => recordLessonCompleted(s, lesson.id))}>Next for you: {planNext.id.replace('L', '')}<ArrowUpRight size={17} aria-hidden="true" /></Link>
          : next ? <Link className="button primary" href={lessonPath(next)} onClick={() => update(s => recordLessonCompleted(s, lesson.id))}>Next lesson<ArrowRight size={17} aria-hidden="true" /></Link>
          : module.assessed ? <Link className="button primary" href={`${modulePath(module.id)}check/`} onClick={() => update(s => recordLessonCompleted(s, lesson.id))}><ClipboardCheck size={17} aria-hidden="true" />Take the check</Link>
          : <Link className="button primary" href="/course/" onClick={() => update(s => recordLessonCompleted(s, lesson.id))}>Course map<ArrowRight size={17} aria-hidden="true" /></Link>}
      </div>
    </section>
  </article>;
}
