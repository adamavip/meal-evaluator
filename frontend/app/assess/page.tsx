'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, Flag, Info } from 'lucide-react';
import { useLearner } from '../../components/LearnerProvider';
import { AnswerOptions, ConfidenceTap } from '../../components/QuestionCard';
import { Loading, TopicIcon, usePageFocus } from '../../components/ui';
import { BANK, questionById } from '../../lib/bank';
import { answeredCount, finishAttempt, SESSION_SIZE } from '../../lib/assessment';
import { COURSE_MODULES, MISCONCEPTIONS } from '../../lib/content';
import { withSeen } from '../../lib/learner';
import { buildPlan } from '../../lib/plan';
import { topicById } from '../../lib/topics';

export default function AssessPage() {
  const router = useRouter();
  const { state, hydrated, update } = useLearner();
  const attempt = state.diagnostic;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousCursor = useRef(attempt?.cursor ?? 0);
  usePageFocus();
  useEffect(() => {
    if (attempt && previousCursor.current !== attempt.cursor) { headingRef.current?.focus({ preventScroll: true }); previousCursor.current = attempt.cursor; }
  }, [attempt]);
  useEffect(() => { if (hydrated && attempt?.finishedAt) router.replace('/results/'); }, [hydrated, attempt, router]);
  if (!hydrated) return <Loading />;
  if (!attempt) return <section className="empty-state paper"><Info size={30} aria-hidden="true" /><h1 tabIndex={-1} data-page-heading>No diagnostic in progress.</h1><p>Start one from the home page. It takes about ten minutes.</p><Link className="button primary" href="/">Go to the home page</Link></section>;
  if (attempt.finishedAt) return <Loading />;

  const item = attempt.items[attempt.cursor];
  const question = questionById(item.questionId)!;
  const topic = topicById(question.topicId);
  const selected = attempt.answers[question.id];
  const confidence = state.confidence[question.id];
  const answered = answeredCount(attempt);
  const confident = attempt.items.filter(i => attempt.answers[i.questionId] && state.confidence[i.questionId]).length;
  const flagged = attempt.flagged.includes(question.id);
  const ready = answered === SESSION_SIZE && confident === SESSION_SIZE;
  const setAttempt = (next: typeof attempt) => update(s => ({ ...s, diagnostic: next }));
  function go(cursor: number) { setAttempt({ ...attempt!, cursor }); }
  function nextIncomplete() {
    const index = attempt!.items.findIndex(i => !attempt!.answers[i.questionId] || !state.confidence[i.questionId]);
    if (index >= 0) go(index);
  }
  function finish() {
    const finished = finishAttempt(attempt!);
    update(s => {
      const plan = buildPlan(BANK, finished, s.confidence, COURSE_MODULES, MISCONCEPTIONS);
      // Keep mastery earned before a retake.
      for (const [topicId, check] of Object.entries(s.checks)) if (check?.masteredAt && plan[topicId as keyof typeof plan]) plan[topicId as keyof typeof plan] = { ...plan[topicId as keyof typeof plan], status: 'mastered', reasons: ['Mastered. A spaced refresher will be offered later.'], startAt: [] };
      return withSeen({ ...s, diagnostic: finished, plan }, finished.items.map(i => i.questionId));
    });
    router.push('/results/');
  }
  return <div className="assessment-layout">
    <aside className="assessment-sidebar">
      <Link className="text-button back-link" href="/"><ArrowLeft size={17} aria-hidden="true" />Home</Link>
      <p className="eyebrow">Your diagnostic</p><h1 className="side-title" tabIndex={-1} data-page-heading>One question<br />at a time.</h1>
      <div className="progress-summary"><strong>{answered}<span> / {SESSION_SIZE}</span></strong><span>answered</span></div>
      <div className="progress-track" role="progressbar" aria-label="Diagnostic progress" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={SESSION_SIZE}><motion.div initial={false} animate={{ width: `${answered / SESSION_SIZE * 100}%` }} transition={{ type: 'spring', stiffness: 160, damping: 26 }} /></div>
      <nav className="question-map" aria-label="Jump to a question">{attempt.items.map((entry, i) => {
        const done = Boolean(attempt.answers[entry.questionId]);
        const withConfidence = done && Boolean(state.confidence[entry.questionId]);
        return <button key={entry.questionId} className={`${done ? 'answered' : ''} ${done && !withConfidence ? 'needs-confidence' : ''} ${i === attempt.cursor ? 'current' : ''}`} onClick={() => go(i)} aria-current={i === attempt.cursor ? 'step' : undefined} aria-label={`Question ${i + 1}${done ? (withConfidence ? ', answered' : ', answered, confidence missing') : ', unanswered'}${attempt.flagged.includes(entry.questionId) ? ', marked for review' : ''}`}>
          {i + 1}{attempt.flagged.includes(entry.questionId) && <span className="flag-dot" />}
        </button>;
      })}</nav>
      <div className="map-legend"><span><i className="legend-answered" />Answered</span><span><i className="legend-confidence" />Needs Sure / Not sure</span><span><i className="legend-flag" />Review</span></div>
      <div className="quiz-tip"><Info size={18} aria-hidden="true" /><p>Choose one answer, then tap Sure or Not sure. The tap separates a lucky guess from knowledge and shapes your plan. Feedback comes at the end.</p></div>
      {state.name && <p className="participant-label">Diagnostic for <strong>{state.name}</strong></p>}
    </aside>
    <section className="question-section" aria-label="Current question">
      <div className="question-meta"><span className={`label-chip ${topic.color}`}><TopicIcon name={topic.icon} size={16} />{topic.title}</span><span className="micro">Question {String(attempt.cursor + 1).padStart(2, '0')} / {SESSION_SIZE}</span></div>
      <div className="question-panel paper">
        <motion.div key={question.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .22 }}>
          <div className="question-kicker"><span className="micro">{question.difficulty === 'foundation' ? 'Core understanding' : 'Apply your understanding'}</span><button className={`flag-button ${flagged ? 'flagged' : ''}`} aria-pressed={flagged} onClick={() => setAttempt({ ...attempt, flagged: flagged ? attempt.flagged.filter(id => id !== question.id) : [...attempt.flagged, question.id] })}><Flag size={16} aria-hidden="true" />{flagged ? 'Marked for review' : 'Mark for review'}</button></div>
          <h2 className="question-title" ref={headingRef} tabIndex={-1} id={`q-${question.id}-heading`}>{question.question}</h2>
          <AnswerOptions question={question} optionIds={item.optionIds} selected={selected} name={`q-${question.id}`} onSelect={id => setAttempt({ ...attempt, answers: { ...attempt.answers, [question.id]: id } })} />
          {selected && <ConfidenceTap value={confidence} onChange={c => update(s => ({ ...s, confidence: { ...s.confidence, [question.id]: c } }))} />}
          <p className="answer-status" aria-live="polite">{selected ? confidence ? <><Check size={15} aria-hidden="true" />Answer and confidence recorded. You can change both.</> : 'Now tap Sure or Not sure.' : 'Select the best answer.'}</p>
        </motion.div>
      </div>
      <div className="question-controls"><button className="button secondary" disabled={attempt.cursor === 0} onClick={() => go(attempt.cursor - 1)}><ArrowLeft size={18} aria-hidden="true" />Previous</button>
        {attempt.cursor < SESSION_SIZE - 1 ? <button className="button primary" onClick={() => go(attempt.cursor + 1)}>Next question<ArrowRight size={18} aria-hidden="true" /></button> : !ready ? <button className="button primary" onClick={nextIncomplete}>Go to incomplete<ArrowRight size={18} aria-hidden="true" /></button> : <button className="button primary" onClick={finish}>See my plan<ArrowUpRight size={20} aria-hidden="true" /></button>}
      </div>
      {ready && attempt.cursor !== SESSION_SIZE - 1 && <div className="all-done"><CheckCheck size={20} aria-hidden="true" /><span>All {SESSION_SIZE} answers are ready.</span><button className="text-button" onClick={finish}>See my plan<ArrowRight size={17} aria-hidden="true" /></button></div>}
      {answered === SESSION_SIZE && confident < SESSION_SIZE && <p className="review-reminder"><Info size={15} aria-hidden="true" />{SESSION_SIZE - confident} {SESSION_SIZE - confident === 1 ? 'answer still needs' : 'answers still need'} a Sure or Not sure tap before you can finish.</p>}
      {attempt.flagged.length > 0 && ready && <p className="review-reminder"><Flag size={15} aria-hidden="true" />You marked {attempt.flagged.length} {attempt.flagged.length === 1 ? 'question' : 'questions'} for review. Use the numbered buttons to revisit them before submitting.</p>}
    </section>
  </div>;
}
