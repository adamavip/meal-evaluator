'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Award, Printer } from 'lucide-react';
import { useLearner } from '../../components/LearnerProvider';
import { Loading, formatDay, usePageFocus } from '../../components/ui';
import { BANK } from '../../lib/bank';
import { COURSE_MODULES } from '../../lib/content';
import { allMastered, masteredCount } from '../../lib/learner';

export default function CertificatePage() {
  const { state, hydrated, update } = useLearner();
  const [name, setName] = useState<string | null>(null);
  usePageFocus();
  if (!hydrated) return <Loading />;
  const ready = allMastered(state) && Boolean(state.capstone);
  const current = name ?? state.name;
  const completedAt = state.capstone && ready ? [state.capstone.completedAt, ...Object.values(state.checks).map(c => c?.masteredAt ?? '')].filter(Boolean).sort().at(-1)! : null;
  if (!ready) return <section className="empty-state paper certificate-locked"><Award size={30} aria-hidden="true" /><h1 tabIndex={-1} data-page-heading>Not yet.</h1><p>The completion certificate unlocks when all ten modules are mastered and the capstone is finished. {masteredCount(state)} of {COURSE_MODULES.length} modules mastered{state.capstone ? ', capstone done' : ', capstone not yet done'}.</p><div className="check-result-actions"><Link className="button primary" href="/course/">Course map</Link><Link className="button secondary" href="/capstone/">Capstone</Link></div></section>;
  function print() {
    const previous = document.title;
    document.title = `CIMMYT-MEAL-course-completion-${current.trim().replace(/[^\p{L}\p{N}]+/gu, '-') || 'learner'}`;
    window.addEventListener('afterprint', () => { document.title = previous; }, { once: true });
    window.print();
  }
  return <div className="certificate-page">
    <div className="certificate-actions no-print">
      <label>Name on the certificate<input maxLength={80} value={current} placeholder="Your name" onChange={e => setName(e.target.value)} onBlur={() => update(s => ({ ...s, name: current.trim().slice(0, 80) }))} /></label>
      <button type="button" className="button primary" onClick={print}><Printer size={18} aria-hidden="true" />Print / save PDF</button>
    </div>
    <article className="certificate paper" aria-labelledby="certificate-title">
      <div className="certificate-head"><img src="/cimmyt-logo.png" alt="CIMMYT" /><span>MEAL Framework 2026–2030 · Self-paced course</span></div>
      <p className="eyebrow">Completion record</p>
      <h1 id="certificate-title" tabIndex={-1} data-page-heading>{current.trim() || 'A CIMMYT learner'}</h1>
      <p className="certificate-line">completed the CIMMYT MEAL course: the diagnostic, all ten modules with their mastery checks, and the capstone scenario.</p>
      <p className="certificate-date">{completedAt ? formatDay(completedAt) : ''}</p>
      <ol className="certificate-modules">{COURSE_MODULES.map(m => <li key={m.id}><span>M{m.order}</span>{m.title}<em>{state.checks[m.id as keyof typeof state.checks]?.masteredAt ? formatDay(state.checks[m.id as keyof typeof state.checks]!.masteredAt!) : ''}</em></li>)}</ol>
      <p className="certificate-foot">Status: completed. This is a completion record, not a credential. Question bank {BANK.bankVersion}. Generated in the learner's browser; no result was stored on a server.</p>
    </article>
  </div>;
}
