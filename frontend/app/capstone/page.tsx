'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Award, CircleCheck, CircleX, RotateCcw } from 'lucide-react';
import { useLearner } from '../../components/LearnerProvider';
import { Loading, TopicIcon, usePageFocus } from '../../components/ui';
import { CAPSTONE, lessonById, lessonPath, moduleById } from '../../lib/content';
import { allMastered, masteredCount } from '../../lib/learner';
import { topicById } from '../../lib/topics';

export default function CapstonePage() {
  const { state, hydrated, update } = useLearner();
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>(() => ({}));
  const [picked, setPicked] = useState<string | null>(null);
  usePageFocus();
  if (!hydrated) return <Loading />;
  const decisions = CAPSTONE.decisions;
  const finished = step >= decisions.length;
  const decision = decisions[step];
  const choice = decision && picked ? decision.choices.find(c => c.id === picked) : null;
  const mastered = masteredCount(state);
  function pick(id: string) { setPicked(id); setChoices(c => ({ ...c, [decision.id]: id })); }
  function advance() {
    if (!choice) return;
    if (!choice.good) { setPicked(null); return; }
    const next = step + 1;
    setPicked(null); setStep(next);
    if (next >= decisions.length) update(s => ({ ...s, capstone: { completedAt: new Date().toISOString(), choices } }));
  }
  function restart() { setStep(0); setPicked(null); setChoices({}); }
  return <div className="capstone-page">
    <header className="capstone-header">
      <p className="eyebrow"><Award size={16} aria-hidden="true" />Capstone · {decisions.length} decisions</p>
      <h1 tabIndex={-1} data-page-heading>{CAPSTONE.title}</h1>
      <p className="section-intro">{CAPSTONE.intro}</p>
      <div className="capstone-project paper"><span className="micro">The project</span><strong>{CAPSTONE.project.name}</strong><p>{CAPSTONE.project.summary}</p></div>
      {state.capstone && !finished && step === 0 && <p className="capstone-done-note"><CircleCheck size={16} aria-hidden="true" />You completed the capstone on {new Date(state.capstone.completedAt).toLocaleDateString()}. Run it again any time.</p>}
    </header>
    <ol className="capstone-trail" aria-label="Decision points">{decisions.map((d, i) => { const topic = topicById(d.moduleId); return <li key={d.id} className={i < step ? 'done' : i === step && !finished ? 'current' : ''} aria-current={i === step && !finished ? 'step' : undefined}><span className={`icon-box ${topic.color}`}><TopicIcon name={topic.icon} size={14} /></span><span>{i + 1}</span></li>; })}</ol>
    <AnimatePresence mode="wait">
      {!finished ? <motion.section key={decision.id} className="decision paper" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} aria-labelledby={`decision-${decision.id}`}>
        <p className="eyebrow">Decision {step + 1} of {decisions.length} · {moduleById(decision.moduleId)?.title}</p>
        <h2 id={`decision-${decision.id}`}>{decision.title}</h2>
        <p className="decision-situation">{decision.situation}</p>
        {!choice && <div className="decision-choices">{decision.choices.map(c => <button type="button" key={c.id} className="button secondary decision-choice" onClick={() => pick(c.id)}>{c.label}</button>)}</div>}
        {choice && <div className={`branch-feedback ${choice.good ? 'good' : 'bad'}`} role="status">
          <p>{choice.good ? <CircleCheck size={20} aria-hidden="true" /> : <CircleX size={20} aria-hidden="true" />}{choice.consequence}</p>
          {!choice.good && lessonById(decision.lessonId) && <Link className="text-button" href={lessonPath(lessonById(decision.lessonId)!)}>Back to lesson {decision.lessonId.replace('L', '')}: {lessonById(decision.lessonId)!.title}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
          <button type="button" className="button primary" onClick={advance}>{choice.good ? (step === decisions.length - 1 ? 'Finish' : 'Continue') : 'Choose again'}<ArrowRight size={17} aria-hidden="true" /></button>
        </div>}
      </motion.section> : <motion.section key="done" className="decision paper capstone-complete" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
        <motion.span className="check-stamp" initial={{ opacity: 0, scale: 1.5 }} animate={{ opacity: 1, scale: 1, rotate: -4 }} transition={{ duration: .25 }}>Completed</motion.span>
        <h2>One project, end to end.</h2>
        <p>{CAPSTONE.closing}</p>
        <div className="check-result-actions">
          {allMastered(state) ? <Link className="button primary" href="/certificate/"><Award size={18} aria-hidden="true" />Open your certificate</Link> : <Link className="button primary" href="/course/">{mastered} of 10 modules mastered: finish the checks<ArrowRight size={17} aria-hidden="true" /></Link>}
          <button type="button" className="button secondary" onClick={restart}><RotateCcw size={16} aria-hidden="true" />Run it again</button>
        </div>
      </motion.section>}
    </AnimatePresence>
  </div>;
}
