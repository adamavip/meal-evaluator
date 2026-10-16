'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, Award, BookOpen, Layers3, Network, RefreshCw, Route, Sparkles, Target } from 'lucide-react';
import { useLearner } from '../components/LearnerProvider';
import { Loading, TopicIcon, usePageFocus } from '../components/ui';
import { BANK, DIAGNOSTIC_COUNT } from '../lib/bank';
import { answeredCount, createAttempt } from '../lib/assessment';
import { COURSE_MINUTES, COURSE_MODULES, LESSONS, modulePath } from '../lib/content';
import { recheckDue } from '../lib/checks';
import { completedLessonIds, masteredCount } from '../lib/learner';
import { formatMinutes, nextForYou, planMinutes } from '../lib/plan';
import { TOPICS } from '../lib/topics';
import { lessonPath } from '../lib/content';

function ResultsChain() {
  const [active, setActive] = useState(0);
  const levels = [
    { label: 'Processes', example: 'Coordinate field trials', detail: 'The activities, partnerships and management actions that enable delivery.', color: 'sky', icon: Network },
    { label: 'Outputs', example: 'Develop a variety', detail: 'The products, technologies, services and capacity delivered by projects.', color: 'gold', icon: Layers3 },
    { label: 'Outcomes', example: 'Farmers adopt a variety', detail: 'Changes in behaviour, practice, systems or performance among partners and farmers.', color: 'green', icon: Route },
    { label: 'Impact', example: 'Lasting gains in income', detail: 'Lasting change supported by credible evidence of CIMMYT’s contribution.', color: 'green', icon: Target },
  ];
  return <div className="chain-board paper">
    <div className="board-top"><span className="eyebrow">The results chain</span><span className="small-tag">Explore the levels</span></div>
    <div className="chain-steps" role="tablist" aria-label="Levels of the results chain">
      {levels.map((level, index) => <div className="chain-step-wrap" key={level.label}>
        <button type="button" role="tab" tabIndex={active === index ? 0 : -1} aria-selected={active === index} aria-controls="chain-detail" id={`chain-tab-${index}`} className={`chain-step ${level.color} ${active === index ? 'is-active' : ''}`} onClick={() => setActive(index)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % 4 : event.key === 'ArrowLeft' ? (index + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : -1;
          if (next >= 0) { event.preventDefault(); setActive(next); document.getElementById(`chain-tab-${next}`)?.focus(); }
        }}>
          <span className="step-number">0{index + 1}</span><level.icon size={23} aria-hidden="true" /><strong>{level.label}</strong>
        </button>
        {index < 3 && <ArrowDown className="chain-arrow" size={19} aria-hidden="true" />}
      </div>)}
    </div>
    <div className="chain-detail" id="chain-detail" role="tabpanel" aria-labelledby={`chain-tab-${active}`}>
      <AnimatePresence mode="wait"><motion.div key={active} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .18 }}>
        <span className="micro">For example</span><h3>{levels[active].example}</h3><p>{levels[active].detail}</p>
      </motion.div></AnimatePresence>
    </div>
    <div className="chain-foot"><span className="live-dot" />Different levels. Different evidence.</div>
  </div>;
}

export default function Home() {
  const router = useRouter();
  const { state, hydrated, update, confirm } = useLearner();
  const [name, setName] = useState<string | null>(null);
  usePageFocus();
  if (!hydrated) return <Loading label="Preparing your course…" />;
  const currentName = name ?? state.name;
  const attempt = state.diagnostic;
  const hasPlan = Boolean(state.plan);
  const mastered = masteredCount(state);
  const next = nextForYou(state.plan, COURSE_MODULES, completedLessonIds(state));
  const rechecks = COURSE_MODULES.filter(m => recheckDue(state.checks[m.id as keyof typeof state.checks]));
  function start() {
    update(s => ({ ...s, name: currentName.trim().slice(0, 80), diagnostic: createAttempt(BANK, currentName), confidence: {}, plan: null }));
    router.push('/assess/');
  }
  function requestStart() {
    if (attempt && !attempt.finishedAt) confirm({ title: 'Start a fresh diagnostic?', body: 'Your current answers will be replaced by a new random set of 15 questions.', confirmLabel: 'Start fresh', cancelLabel: 'Keep current diagnostic', onConfirm: start });
    else if (hasPlan) confirm({ title: 'Retake the diagnostic?', body: 'A new diagnostic rebuilds your plan from scratch. Mastered modules stay mastered.', confirmLabel: 'Retake', cancelLabel: 'Keep my plan', onConfirm: start });
    else start();
  }
  return <>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="square-dot" /> CIMMYT MEAL · Self-paced course</div>
        <h1 tabIndex={-1} data-page-heading>Learn the<br /><span className="highlight">MEAL</span><br />framework.</h1>
        <p className="hero-description">A 15-question diagnostic tells you what to skip and what to study. Ten short modules, animated explainers, mastery checks and a capstone take you from a theory of change to evidence of impact.</p>
        <div className="hero-facts"><span><strong>{COURSE_MODULES.length}</strong> modules</span><span><strong>{LESSONS.length}</strong> lessons</span><span><strong>~{Math.round(COURSE_MINUTES / 60 * 2) / 2} h</strong> at your pace</span></div>
        {hasPlan ? <div className="continue-box paper">
          <p className="eyebrow">Continue your plan</p>
          <p className="continue-line">{state.plan && planMinutes(state.plan, COURSE_MODULES) > 0 ? `About ${formatMinutes(planMinutes(state.plan, COURSE_MODULES))} left to close your gaps.` : 'Your plan has no study left. Take the remaining checks.'} {mastered} of {COURSE_MODULES.length} modules mastered.</p>
          {next ? <Link className="button primary start-button" href={lessonPath(next)}>Next for you: {next.id.replace('L', '')} {next.title}<ArrowUpRight size={22} aria-hidden="true" /></Link> : <Link className="button primary start-button" href="/course/">Open the course map<ArrowUpRight size={22} aria-hidden="true" /></Link>}
          <div className="continue-links"><Link className="text-button" href="/results/">See your plan<ArrowRight size={16} aria-hidden="true" /></Link><button type="button" className="text-button" onClick={requestStart}><RefreshCw size={14} aria-hidden="true" />Retake the diagnostic</button></div>
        </div> : <form className="start-form" onSubmit={event => { event.preventDefault(); requestStart(); }}>
          <label htmlFor="participant">Your name <span>(optional, for your plan and certificate)</span></label>
          <input id="participant" autoComplete="name" maxLength={80} value={currentName} placeholder="Enter your name" onChange={event => setName(event.target.value)} />
          <button className="button primary start-button" type="submit">{attempt && !attempt.finishedAt ? 'Start a fresh diagnostic' : 'Start the diagnostic'}<ArrowUpRight size={24} aria-hidden="true" /></button>
          {attempt && !attempt.finishedAt && <Link href="/assess/" className="resume-link">Resume your diagnostic · {answeredCount(attempt)}/15 answered<ArrowRight size={17} aria-hidden="true" /></Link>}
          <p className="privacy-note">Your answers stay in this browser. No time limit. Nothing is locked: you can also <Link href="/course/">browse the course</Link> without the diagnostic.</p>
        </form>}
      </div>
      <div className="hero-visual"><span className="sticker green"><Sparkles size={18} aria-hidden="true" /> Diagnose. Study. Master.</span><ResultsChain /><div className="visual-note"><ArrowUpRight size={23} aria-hidden="true" /><span>Evidence has a purpose.<br /><strong>Better decisions.</strong></span></div></div>
    </section>
    {rechecks.length > 0 && <section className="recheck-strip paper" aria-label="Spaced refreshers">
      <Award size={22} aria-hidden="true" /><p><strong>Refresher ready.</strong> It has been a week or more since you mastered {rechecks.map(m => m.title).join(', ')}. Three quick questions keep it fresh.</p>
      <div className="recheck-links">{rechecks.map(m => <Link key={m.id} className="button secondary" href={`${modulePath(m.id)}check/?recheck=1`}>{m.short}<ArrowRight size={16} aria-hidden="true" /></Link>)}</div>
    </section>}
    <section className="how-strip" aria-label="How the course works">
      <div><span className="number-box">01</span><p><strong>Take the diagnostic</strong><span>15 questions, with a Sure or Not sure tap after each.</span></p></div>
      <div><span className="number-box">02</span><p><strong>Follow your plan</strong><span>Modules and lessons where your answers showed gaps, with a reason for each.</span></p></div>
      <div><span className="number-box">03</span><p><strong>Prove mastery</strong><span>Five-question checks per module. Capstone and certificate when all ten are done.</span></p></div>
    </section>
    <section className="topics-section">
      <div className="section-heading"><div><p className="eyebrow">Inside the course</p><h2>Ten modules. One framework.</h2></div><Link className="text-button" href="/course/">Open the course map<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
      <p className="section-intro">Every module is self-standing. The order follows the framework's own logic: why, what, how to measure, how to manage data, how to claim impact, how to learn and account, how to run it.</p>
      <div className="topics-grid">{TOPICS.map((topic, i) => {
        const module = COURSE_MODULES.find(m => m.id === topic.id);
        const done = Boolean(state.checks[topic.id]?.masteredAt);
        return <Link key={topic.id} className={`topic-card paper ${topic.color} ${done ? 'is-mastered' : ''}`} href={modulePath(topic.id)}>
          <span className="topic-top"><TopicIcon name={topic.icon} /><span className="micro">{String(i + 1).padStart(2, '0')}</span></span><h3>{topic.title}</h3><p>{topic.focus}</p><span className="topic-bottom">{done ? 'Mastered' : `${module?.lessons.length ?? 0} lessons · ${module?.minutes ?? 0} min`}<ArrowUpRight size={18} aria-hidden="true" /></span>
        </Link>;
      })}</div>
    </section>
    <section className="source-strip"><BookOpen size={27} aria-hidden="true" /><p><strong>Built from the CIMMYT MEAL Framework 2026–2030.</strong><span>Every lesson cites the section it teaches. Every one of the {BANK.questions.length} questions keeps its source reference ({DIAGNOSTIC_COUNT} in the diagnostic draw).</span></p><Link className="text-button" href="/about/">How it works<ArrowRight size={18} aria-hidden="true" /></Link></section>
  </>;
}

