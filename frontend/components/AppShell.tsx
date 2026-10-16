'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'motion/react';
import { Award, Info, RefreshCw, X } from 'lucide-react';
import { LearnerProvider, useLearner } from './LearnerProvider';
import type { ConfirmOptions } from './LearnerProvider';
import { COURSE_MODULES } from '../lib/content';
import { allMastered, masteredCount } from '../lib/learner';
import { BANK } from '../lib/bank';

function ConfirmDialog({ options, close }: { options: ConfirmOptions | null; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (options) ref.current?.showModal(); else ref.current?.close(); }, [options]);
  return <dialog ref={ref} className="confirm-dialog paper" onCancel={close} onClose={close}>
    {options && <div><span className="icon-box gold"><RefreshCw size={22} aria-hidden="true" /></span><h2>{options.title}</h2><p>{options.body}</p>
      <div className="dialog-actions"><button className="button secondary" autoFocus onClick={close}>{options.cancelLabel ?? 'Keep going'}</button><button className="button primary" onClick={() => { options.onConfirm(); close(); }}>{options.confirmLabel}</button></div></div>}
  </dialog>;
}

function ProgressStrip() {
  const { state, hydrated } = useLearner();
  if (!hydrated) return null;
  const mastered = masteredCount(state);
  const hasProgress = Boolean(state.diagnostic) || Object.keys(state.lessons).length > 0 || mastered > 0;
  if (!hasProgress) return null;
  return <div className="progress-strip no-print" aria-label="Course progress">
    <span className="progress-strip-label"><Award size={15} aria-hidden="true" />{mastered} of {COURSE_MODULES.length} modules mastered</span>
    <span className="progress-strip-track" aria-hidden="true">{COURSE_MODULES.map(m => <i key={m.id} className={state.checks[m.id as keyof typeof state.checks]?.masteredAt ? 'done' : ''} />)}</span>
    {allMastered(state) && state.capstone && <Link href="/certificate/" className="progress-strip-link">Certificate</Link>}
    {!allMastered(state) && state.plan && <Link href="/results/" className="progress-strip-link">Your plan</Link>}
  </div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, hydrated, storageWarning, confirm, reset } = useLearner();
  const route = pathname.split('/').filter(Boolean)[0] ?? 'home';
  const active = (prefix: string) => (prefix === 'home' ? pathname === '/' : pathname.startsWith(`/${prefix}`)) ? 'active' : '';
  const hasProgress = hydrated && (Boolean(state.diagnostic) || Object.keys(state.lessons).length > 0 || Object.keys(state.checks).length > 0 || Boolean(state.name));
  return <div className={`app-shell screen-${route}`} data-route={route}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header no-print"><div className="header-inner">
      <Link href="/" className="brand-button" aria-label="CIMMYT MEAL course home"><img src="/cimmyt-logo.png" width="272" height="32" alt="CIMMYT" /></Link>
      <div className="header-divider" /><span className="site-name">MEAL<br /><strong>Course</strong></span>
      <nav aria-label="Main navigation">
        <Link className={active('home')} href="/">Home</Link>
        <Link className={active('assess') || active('results')} href={state.diagnostic?.finishedAt ? '/results/' : '/assess/'}>{state.diagnostic?.finishedAt ? 'Your plan' : 'Diagnostic'}</Link>
        <Link className={active('course')} href="/course/">Course</Link>
        <Link className={active('capstone')} href="/capstone/">Capstone</Link>
        <Link className={active('bank')} href="/bank/">Question bank</Link>
        <Link className={active('about')} href="/about/">About</Link>
      </nav>
      <span className="header-edition">2026–2030</span>
    </div></header>
    <ProgressStrip />
    {storageWarning && <div className="storage-warning no-print" role="status"><Info size={17} aria-hidden="true" />This browser cannot save your progress. Keep this tab open and export or print before leaving.</div>}
    <main id="main-content" className="main-content">{children}</main>
    <footer className="site-footer no-print"><div><span className="footer-mark">MEAL</span><p>Monitoring · Evaluation · Accountability · Learning<br /><span>CIMMYT framework 2026–2030 · Self-paced course</span></p></div>
      {hasProgress && <button className="text-button" onClick={() => confirm({ title: 'Clear your saved progress?', body: 'This removes your name, diagnostic, plan, lesson history and mastery checks from this browser. Export your learning record first if you want to keep it.', confirmLabel: 'Clear everything', onConfirm: reset })}>Clear my saved progress<X size={15} aria-hidden="true" /></button>}
      <span className="micro">Bank {BANK.bankVersion} · {BANK.questions.length} questions</span></footer>
  </div>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user"><LearnerProvider renderDialog={(options, close) => <ConfirmDialog options={options} close={close} />}><Shell>{children}</Shell></LearnerProvider></MotionConfig>;
}
