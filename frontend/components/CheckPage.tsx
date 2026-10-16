'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Award, Check, Clock, Info, RefreshCw } from 'lucide-react';
import { useLearner } from './LearnerProvider';
import { AnswerOptions } from './QuestionCard';
import { BackLink, Loading, SourceNote, TopicIcon, usePageFocus } from './ui';
import { BANK, questionById } from '../lib/bank';
import { checkAnswered, cooldownUntil, createCheck, finishCheck, recheckDue, scoreCheck } from '../lib/checks';
import type { CheckAttempt } from '../lib/checks';
import { COURSE_MODULES, isTopicId, lessonById, lessonPath, moduleById, modulePath, objectiveById } from '../lib/content';
import { withSeen } from '../lib/learner';
import { applyCheckFailure, applyRecheckFailure, markMastered } from '../lib/plan';
import { topicById } from '../lib/topics';
import type { TopicId } from '../lib/topics';

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!active) return; const h = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(h); }, [active]);
  return now;
}

export function CheckPage({ moduleId }: { moduleId: string }) {
  const { state, hydrated, update } = useLearner();
  const params = useSearchParams();
  const wantRecheck = params.get('recheck') === '1';
  const module = moduleById(moduleId);
  const topicId: TopicId | null = isTopicId(moduleId) ? moduleId : null;
  usePageFocus(moduleId);
  const active = state.activeCheck && state.activeCheck.topicId === topicId ? state.activeCheck : null;
  const [finished, setFinished] = useState<CheckAttempt | null>(null);
  const record = topicId ? state.checks[topicId] : undefined;
  const cooldown = topicId ? cooldownUntil(BANK, record?.attempts ?? []) : null;
  const now = useNow(Boolean(cooldown));
  const result = useMemo(() => finished ? scoreCheck(BANK, finished) : null, [finished]);
  if (!module || !topicId) return <section className="empty-state paper"><h1 tabIndex={-1} data-page-heading>No check for this module.</h1><Link className="button primary" href="/course/">Course map</Link></section>;
  if (!hydrated) return <Loading />;
  const topic = topicById(topicId);
  const mastered = Boolean(record?.masteredAt);
  const recheckAvailable = recheckDue(record);
  const cooldownActive = cooldown && Date.parse(cooldown) > now;

  function start(kind: 'check' | 'recheck') {
    const attempt = createCheck(BANK, topicId as TopicId, state.seenQuestionIds, undefined, kind);
    setFinished(null);
    update(s => ({ ...s, activeCheck: attempt }));
  }
  function change(next: CheckAttempt) { update(s => ({ ...s, activeCheck: next })); }
  function submit() {
    if (!active) return;
    const done = finishCheck(active);
    const score = scoreCheck(BANK, done);
    setFinished(done);
    update(s => {
      const prev = s.checks[topicId as TopicId] ?? { attempts: [] };
      const nowIso = done.finishedAt!;
      const checks = { ...s.checks, [topicId as TopicId]: { ...prev, attempts: [...prev.attempts, done], ...(done.kind === 'check' && score.passed ? { masteredAt: nowIso } : {}), ...(done.kind === 'recheck' ? { lastRecheckAt: nowIso } : {}) } };
      let plan = s.plan;
      if (plan) {
        if (score.passed && done.kind === 'check') plan = markMastered(plan, topicId as TopicId, nowIso);
        else if (!score.passed && done.kind === 'check') plan = applyCheckFailure(plan, topicId as TopicId, score.missedObjectiveIds, COURSE_MODULES, nowIso);
        else if (!score.passed && done.kind === 'recheck') plan = applyRecheckFailure(plan, topicId as TopicId, score.missedObjectiveIds, COURSE_MODULES, nowIso);
      }
      return withSeen({ ...s, checks, plan, activeCheck: null }, done.items.map(i => i.questionId));
    });
  }

  // --- results view ---------------------------------------------------------
  if (finished && result) {
    const missedLessons = [...new Set(result.missedObjectiveIds.flatMap(id => module.lessons.filter(l => l.objectiveIds.includes(id)).map(l => l.id)))].map(lessonById).filter(l => l !== undefined);
    return <div className="check-page">
      <BackLink href={modulePath(module.id)}>{module.title}</BackLink>
      <header className={`check-result paper ${result.passed ? 'passed' : 'failed'}`}>
        <motion.span className="check-stamp" initial={{ opacity: 0, scale: 1.5, rotate: 0 }} animate={{ opacity: 1, scale: 1, rotate: -4 }} transition={{ duration: .25 }}>{result.passed ? (finished.kind === 'recheck' ? 'Still fresh' : 'Mastered') : 'Not yet'}</motion.span>
        <p className="eyebrow">{finished.kind === 'recheck' ? 'Refresher' : 'Mastery check'} · {module.title}</p>
        <h1 tabIndex={-1} data-page-heading>{result.correct} of {result.total} correct.</h1>
        <p className="check-result-copy">{result.passed ? (finished.kind === 'recheck' ? 'The module stays mastered. See you in a month.' : 'This module is now marked as mastered and leaves your plan. Explanations below.') : finished.kind === 'recheck' ? 'The module moves back to Review. The lessons for what you missed are marked below.' : `The pass mark is 4 of 5. The lessons for what you missed are listed below, then retry with a fresh draw.${cooldownUntil(BANK, [...(record?.attempts ?? []), finished]) ? ' After two misses in a row, there is a ten-minute pause before the next attempt.' : ''}`}</p>
        {!result.passed && missedLessons.length > 0 && <div className="missed-lessons"><p className="eyebrow">Open these first</p><ul>{missedLessons.map(l => <li key={l.id}><Link href={lessonPath(l)}>{l.id.replace('L', '')} {l.title}<ArrowUpRight size={15} aria-hidden="true" /></Link></li>)}</ul></div>}
        <div className="check-result-actions">
          {result.passed ? <Link className="button primary" href={state.plan ? '/results/' : '/course/'}><Award size={18} aria-hidden="true" />{state.plan ? 'Back to your plan' : 'Course map'}</Link> : <button type="button" className="button primary" disabled={Boolean(cooldownUntil(BANK, [...(record?.attempts ?? []), finished]))} onClick={() => start('check')}><RefreshCw size={17} aria-hidden="true" />Retry with a fresh draw</button>}
          <Link className="button secondary" href={modulePath(module.id)}>Module page</Link>
        </div>
      </header>
      <section className="review-list">{result.rows.map((row, i) => {
        const selected = row.question.options.find(o => o.id === row.selectedId);
        const answer = row.question.options.find(o => o.id === row.question.correctOptionId)!;
        const objectives = row.question.objectiveIds.map(objectiveById).filter(o => o !== undefined);
        return <article key={row.question.id} className={`review-card ${row.correct ? 'correct' : 'incorrect'}`}>
          <div className="review-card-top"><span className="micro">{String(i + 1).padStart(2, '0')} · {objectives.map(o => o.text).join(' · ')}</span><span className={`result-label ${row.correct ? 'is-correct' : 'is-incorrect'}`}>{row.correct ? <Check size={15} aria-hidden="true" /> : <ArrowUpRight size={15} aria-hidden="true" />}{row.correct ? 'Correct' : 'Revisit'}</span></div>
          <h3>{row.question.question}</h3><p className="your-answer"><strong>Your answer</strong><span>{selected?.text ?? 'Unanswered'}</span></p>
          {!row.correct && <p className="correct-answer"><strong>Correct answer</strong><span>{answer.text}</span></p>}
          <div className="explanation"><p>{row.question.explanation}</p>{!row.correct && <p className="review-tip"><strong>Try this:</strong> {row.question.reviewTip}</p>}</div><SourceNote question={row.question} />
        </article>;
      })}</section>
    </div>;
  }

  // --- in-progress view -----------------------------------------------------
  if (active) {
    const item = active.items[active.cursor];
    const question = questionById(item.questionId)!;
    const answered = checkAnswered(active);
    const selected = active.answers[question.id];
    const size = active.items.length;
    return <div className="assessment-layout check-layout">
      <aside className="assessment-sidebar">
        <button type="button" className="text-button back-link" onClick={() => update(s => ({ ...s, activeCheck: null }))}><ArrowLeft size={17} aria-hidden="true" />Abandon this attempt</button>
        <p className="eyebrow">{active.kind === 'recheck' ? 'Refresher' : 'Mastery check'}</p><h1 className="side-title" tabIndex={-1} data-page-heading>{module.title}</h1>
        <div className="progress-summary"><strong>{answered}<span> / {size}</span></strong><span>answered</span></div>
        <div className="progress-track" role="progressbar" aria-label="Check progress" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={size}><motion.div initial={false} animate={{ width: `${answered / size * 100}%` }} transition={{ type: 'spring', stiffness: 160, damping: 26 }} /></div>
        <nav className="question-map" aria-label="Jump to a question">{active.items.map((entry, i) => <button key={entry.questionId} className={`${active.answers[entry.questionId] ? 'answered' : ''} ${i === active.cursor ? 'current' : ''}`} onClick={() => change({ ...active, cursor: i })} aria-current={i === active.cursor ? 'step' : undefined} aria-label={`Question ${i + 1}${active.answers[entry.questionId] ? ', answered' : ', unanswered'}`}>{i + 1}</button>)}</nav>
        <div className="quiz-tip"><Info size={18} aria-hidden="true" /><p>{active.kind === 'recheck' ? 'Three questions. Miss one and the module moves back to Review.' : 'Five questions, four to pass. Explanations and sources after you submit.'}</p></div>
      </aside>
      <section className="question-section" aria-label="Current question">
        <div className="question-meta"><span className={`label-chip ${topic.color}`}><TopicIcon name={topic.icon} size={16} />{topic.title}</span><span className="micro">Question {active.cursor + 1} / {size}</span></div>
        <div className="question-panel paper">
          <motion.div key={question.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .22 }}>
            <div className="question-kicker"><span className="micro">{question.difficulty === 'foundation' ? 'Core understanding' : 'Apply your understanding'}</span></div>
            <h2 className="question-title" tabIndex={-1} id={`q-${question.id}-heading`}>{question.question}</h2>
            <AnswerOptions question={question} optionIds={item.optionIds} selected={selected} name={`q-${question.id}`} onSelect={id => change({ ...active, answers: { ...active.answers, [question.id]: id } })} />
          </motion.div>
        </div>
        <div className="question-controls"><button className="button secondary" disabled={active.cursor === 0} onClick={() => change({ ...active, cursor: active.cursor - 1 })}><ArrowLeft size={18} aria-hidden="true" />Previous</button>
          {active.cursor < size - 1 ? <button className="button primary" onClick={() => change({ ...active, cursor: active.cursor + 1 })}>Next<ArrowRight size={18} aria-hidden="true" /></button> : answered < size ? <button className="button primary" onClick={() => change({ ...active, cursor: active.items.findIndex(i => !active.answers[i.questionId]) })}>Go to unanswered<ArrowRight size={18} aria-hidden="true" /></button> : <button className="button primary" onClick={submit}>Submit<ArrowUpRight size={20} aria-hidden="true" /></button>}
        </div>
        {answered === size && active.cursor !== size - 1 && <div className="all-done"><Check size={20} aria-hidden="true" /><span>All {size} answers are ready.</span><button className="text-button" onClick={submit}>Submit<ArrowRight size={17} aria-hidden="true" /></button></div>}
      </section>
    </div>;
  }

  // --- start view -----------------------------------------------------------
  const minutesLeft = cooldownActive ? Math.ceil((Date.parse(cooldown!) - now) / 60000) : 0;
  return <div className="check-page">
    <BackLink href={modulePath(module.id)}>{module.title}</BackLink>
    <header className="check-start paper">
      <p className="eyebrow"><TopicIcon name={topic.icon} size={16} />Mastery check · {module.title}</p>
      <h1 tabIndex={-1} data-page-heading>{mastered ? 'Already mastered.' : 'Five questions. Four to pass.'}</h1>
      <p className="check-start-copy">{mastered ? `You mastered this module${record?.masteredAt ? ` on ${new Date(record.masteredAt).toLocaleDateString()}` : ''}. ${recheckAvailable ? 'A three-question refresher is ready.' : 'You can retake the full check any time; a refresher is offered 7 days after mastery.'}` : 'Drawn from this module\'s check pool, covering at least four objectives, never repeating a question you have already seen in this browser. No time limit. Explanations and framework references after you submit.'}</p>
      {record && record.attempts.length > 0 && <p className="check-history"><Clock size={14} aria-hidden="true" />Attempts: {record.attempts.map((a, i) => { const s = scoreCheck(BANK, a); return <span key={a.id} className={s.passed ? 'good' : 'bad'}>{i ? ' · ' : ''}{a.kind === 'recheck' ? 'R ' : ''}{s.correct}/{s.total}</span>; })}</p>}
      {cooldownActive && <p className="cooldown-note" role="status"><Info size={16} aria-hidden="true" />Two misses in a row. Take {minutesLeft} more {minutesLeft === 1 ? 'minute' : 'minutes'} with the lessons below, then try a fresh draw.</p>}
      <div className="check-result-actions">
        {(wantRecheck || recheckAvailable) && mastered && <button type="button" className="button primary" onClick={() => start('recheck')}><RefreshCw size={17} aria-hidden="true" />Take the 3-question refresher</button>}
        <button type="button" className={`button ${mastered && recheckAvailable ? 'secondary' : 'primary'}`} disabled={Boolean(cooldownActive)} onClick={() => start('check')}>{mastered ? 'Retake the full check' : 'Start the check'}<ArrowUpRight size={18} aria-hidden="true" /></button>
        <Link className="button secondary" href={modulePath(module.id)}>Lessons first</Link>
      </div>
      {cooldownActive && state.plan && state.plan[topicId].startAt.length > 0 && <ul className="missed-lessons-inline">{state.plan[topicId].startAt.map(lessonById).filter(l => l !== undefined).map(l => <li key={l.id}><Link href={lessonPath(l)}>{l.id.replace('L', '')} {l.title}</Link></li>)}</ul>}
    </header>
  </div>;
}
