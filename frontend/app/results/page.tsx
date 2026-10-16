'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, CircleCheck, ClipboardCheck, Info, Printer, RefreshCw } from 'lucide-react';
import { useLearner } from '../../components/LearnerProvider';
import { PlanPanel } from '../../components/PlanPanel';
import { Loading, SourceNote, TopicIcon, formatDate, usePageFocus } from '../../components/ui';
import { BANK } from '../../lib/bank';
import { scoreAttempt } from '../../lib/assessment';
import type { Question } from '../../lib/assessment';
import { topicById } from '../../lib/topics';
import { misconceptionByTag } from '../../lib/content';

function ScoreDial({ percent, correct }: { percent: number; correct: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? percent : 0);
  useEffect(() => {
    if (reduced) { setShown(percent); return; }
    let handle = 0;
    const start = performance.now();
    function tick(now: number) { const t = Math.min((now - start) / 900, 1); setShown(Math.round(percent * (1 - (1 - t) ** 3))); if (t < 1) handle = requestAnimationFrame(tick); }
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [percent, reduced]);
  return <div className="score-dial" role="img" aria-label={`Overall score ${percent} percent, ${correct} of 15 correct`}>
    <svg viewBox="0 0 220 220" aria-hidden="true"><circle className="dial-track" cx="110" cy="110" r="92" /><motion.circle className="dial-value" cx="110" cy="110" r="92" pathLength="100" strokeDasharray="100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 100 - percent }} transition={{ duration: reduced ? 0 : 1, ease: 'easeOut' }} /></svg>
    <div className="dial-label" aria-hidden="true"><strong className="screen-score">{shown}<span>%</span></strong><strong className="print-score">{percent}<span>%</span></strong><span>{correct} of 15 correct</span></div>
  </div>;
}

function ReviewCard({ question, selectedId, correct, index, confidence }: { question: Question; selectedId: string | null; correct: boolean; index: number; confidence?: 'sure' | 'unsure' }) {
  const selected = question.options.find(o => o.id === selectedId);
  const answer = question.options.find(o => o.id === question.correctOptionId)!;
  const tag = selectedId ? question.misconceptions?.[selectedId] : undefined;
  const misconception = tag ? misconceptionByTag(tag) : undefined;
  return <article className={`review-card ${correct ? 'correct' : 'incorrect'}`}>
    <div className="review-card-top"><span className="micro">{String(index + 1).padStart(2, '0')} · {topicById(question.topicId).title}{confidence ? ` · ${confidence === 'sure' ? 'Sure' : 'Not sure'}` : ''}</span><span className={`result-label ${correct ? 'is-correct' : 'is-incorrect'}`}>{correct ? <Check size={15} aria-hidden="true" /> : <ArrowUpRight size={15} aria-hidden="true" />}{correct ? 'Correct' : 'Revisit'}</span></div>
    <h3>{question.question}</h3><p className="your-answer"><strong>Your answer</strong><span>{selected?.text ?? 'Unanswered'}</span></p>
    {!correct && <p className="correct-answer"><strong>Correct answer</strong><span>{answer.text}</span></p>}
    <div className="explanation"><p>{question.explanation}</p>{!correct && <p className="review-tip"><strong>Try this:</strong> {question.reviewTip}</p>}{misconception && <p className="review-tip misconception-note"><strong>Likely mix-up:</strong> {misconception.description}</p>}</div><SourceNote question={question} />
  </article>;
}

export default function ResultsPage() {
  const { state, hydrated, confirm } = useLearner();
  const attempt = state.diagnostic;
  usePageFocus();
  const result = useMemo(() => attempt?.finishedAt ? scoreAttempt(BANK, attempt) : null, [attempt]);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'revisit'>('all');
  if (!hydrated) return <Loading />;
  if (!attempt || !attempt.finishedAt || !result) return <section className="empty-state paper"><Info size={30} aria-hidden="true" /><h1 tabIndex={-1} data-page-heading>No finished diagnostic yet.</h1><p>Take the 15-question diagnostic to get your personal plan.</p><Link className="button primary" href="/">Go to the home page</Link></section>;
  function printResult() {
    const previous = document.title;
    document.title = `CIMMYT-MEAL-plan-${state.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-') || 'participant'}-${attempt!.finishedAt!.slice(0, 10)}`;
    window.addEventListener('afterprint', () => { document.title = previous; }, { once: true });
    window.print();
  }
  return <div className="results-page">
    <div className="print-header"><img src="/cimmyt-logo.png" alt="CIMMYT" /><span>MEAL framework · 2026–2030</span></div>
    <div className="section-heading result-heading"><div><p className="eyebrow">Diagnostic complete</p><h1 tabIndex={-1} data-page-heading>Your MEAL<br className="mobile-break" /> plan.</h1><p className="result-byline">{state.name || 'Participant'} · {formatDate(attempt.finishedAt)}<span className="report-id"> · {attempt.id.slice(0, 8).toUpperCase()}</span></p></div><div className="result-actions no-print"><button className="button primary" onClick={printResult}><Printer size={19} aria-hidden="true" />Print / save PDF</button><Link className="text-button" href="/" onClick={e => { e.preventDefault(); confirm({ title: 'Retake the diagnostic?', body: 'A new diagnostic rebuilds your plan from scratch. Mastered modules stay mastered. Start it from the home page.', confirmLabel: 'Go to home', onConfirm: () => { window.location.href = '/'; } }); }}><RefreshCw size={16} aria-hidden="true" />Retake</Link></div></div>
    {state.plan && <PlanPanel plan={state.plan} />}
    <div className="results-overview"><div className="score-card paper green"><div className="score-top"><span className="eyebrow">Diagnostic score</span><ClipboardCheck size={24} aria-hidden="true" /></div><ScoreDial percent={result.percent} correct={result.correct} /><p>Each answer carries equal weight.</p></div><div className="result-summary paper"><p className="eyebrow">What your result tells you</p><h2>{result.correct === 15 ? 'A clear grasp of this set.' : 'The plan above is the point.'}</h2><p>{result.correct === 15 ? 'You answered all 15 questions correctly. Take the mastery checks to mark modules as mastered, or dive into any module you want to deepen.' : `You answered ${result.correct} of 15 questions correctly. The plan uses which questions you missed, how confident you were and which distractor you chose to point at specific lessons.`}</p><div className="sample-note"><Info size={19} aria-hidden="true" /><p>Each topic has only one or two questions in this diagnostic. The plan guides study; the 5-question mastery checks establish mastery.</p></div><p className="print-hint no-print">To keep your plan, choose “Save as PDF” in the print window.</p></div></div>
    <section className="topic-results"><div className="section-heading"><div><p className="eyebrow">Your understanding by topic</p><h2>See the detail.</h2></div><span className="small-tag">Correct / asked</span></div><div className="topic-score-grid">{result.topics.map(t => {
      const topic = topicById(t.topicId);
      return <div className="topic-score" key={t.topicId}><div className="topic-score-title"><span className={`icon-box ${topic.color}`}><TopicIcon name={topic.icon} size={18} /></span><h3>{topic.title}</h3><strong>{t.percent}<span>%</span></strong></div><div className="topic-bar" aria-hidden="true"><motion.div initial={{ width: 0 }} animate={{ width: `${t.percent}%` }} transition={{ duration: .7, delay: .15 }} className={t.correct === t.asked ? 'green' : 'gold'} /><div className="print-bar" style={{ width: `${t.percent}%` }} /></div><div className="topic-score-foot"><span>{t.correct} / {t.asked} correct</span><span>{state.plan ? state.plan[t.topicId].status.replace('-', ' ') : ''}</span></div></div>;
    })}</div></section>
    <section className="answer-review"><div className="section-heading"><div><p className="eyebrow">Answers & explanations</p><h2>Review your diagnostic.</h2></div><div className="segmented no-print" aria-label="Filter answer review"><button aria-pressed={reviewFilter === 'all'} onClick={() => setReviewFilter('all')}>All 15</button><button aria-pressed={reviewFilter === 'revisit'} onClick={() => setReviewFilter('revisit')}>To revisit · {15 - result.correct}</button></div></div>
      {reviewFilter === 'revisit' && result.correct === 15 && <div className="empty-state no-print"><CircleCheck size={30} aria-hidden="true" /><h3>All answers are correct.</h3><p>Select “All 15” to read the explanations.</p></div>}
      <div className="review-list">{result.rows.map((row, i) => <div className={reviewFilter === 'revisit' && row.correct ? 'print-only-review' : ''} key={row.question.id}><ReviewCard {...row} index={i} confidence={state.confidence[row.question.id]} /></div>)}</div>
    </section>
    <footer className="report-footer"><p><strong>Source:</strong> CIMMYT MEAL Framework 2026–2030, supplied workshop document. Bank {BANK.bankVersion}. Scores describe this random set of 15 questions only.</p><p>Diagnostic ID: {attempt.id} · {attempt.finishedAt.slice(0, 10)}</p></footer>
  </div>;
}
