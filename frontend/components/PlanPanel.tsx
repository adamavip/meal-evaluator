'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Clock, Eye } from 'lucide-react';
import type { TopicId } from '../lib/topics';
import { topicById } from '../lib/topics';
import { COURSE_MODULES, lessonById, lessonPath, modulePath } from '../lib/content';
import { entryMinutes, formatMinutes, markKnown, needsStudy, orderPlan, planMinutes } from '../lib/plan';
import type { Plan } from '../lib/plan';
import { useLearner } from './LearnerProvider';
import { StatusStamp, TopicIcon } from './ui';

export function PlanPanel({ plan, compact }: { plan: Plan; compact?: boolean }) {
  const { update } = useLearner();
  const [showLater, setShowLater] = useState(false);
  const ordered = orderPlan(plan, COURSE_MODULES);
  const study = ordered.filter(id => needsStudy(plan[id].status));
  const first = study.slice(0, 3);
  const later = ordered.filter(id => !first.includes(id));
  const minutes = planMinutes(plan, COURSE_MODULES);
  function card(topicId: TopicId) {
    const entry = plan[topicId];
    const topic = topicById(topicId);
    const module = COURSE_MODULES.find(m => m.id === topicId);
    const startLesson = entry.startAt[0] ? lessonById(entry.startAt[0]) : module?.lessons[0];
    const mins = entryMinutes(entry, module);
    return <article className={`plan-card paper status-${entry.status}`} key={topicId}>
      <div className="plan-card-top"><span className={`icon-box ${topic.color}`}><TopicIcon name={topic.icon} size={18} /></span><h3>{topic.title}</h3><StatusStamp status={entry.known ? 'known' : entry.status} small /></div>
      <ul className="plan-reasons">{entry.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
      <div className="plan-card-foot">
        {mins > 0 && <span className="plan-minutes"><Clock size={14} aria-hidden="true" />{formatMinutes(mins)}</span>}
        {entry.status === 'mastered' ? <Link className="text-button" href={modulePath(topicId)}>Open module<ArrowUpRight size={16} aria-hidden="true" /></Link>
          : entry.status === 'check-first' || entry.status === 'looking-good' ? <Link className="text-button" href={`${modulePath(topicId)}check/`}>Take the check<ArrowUpRight size={16} aria-hidden="true" /></Link>
          : startLesson && <Link className="text-button" href={lessonPath(startLesson)}>Open lesson {startLesson.id.replace('L', '')}<ArrowUpRight size={16} aria-hidden="true" /></Link>}
        {needsStudy(entry.status) && <button type="button" className="text-button plan-known no-print" onClick={() => update(s => s.plan ? { ...s, plan: markKnown(s.plan, topicId) } : s)}><Eye size={14} aria-hidden="true" />Mark as known</button>}
      </div>
    </article>;
  }
  return <section className="plan-panel" aria-labelledby="plan-heading">
    <div className="section-heading"><div><p className="eyebrow">Your plan</p><h2 id="plan-heading">{minutes > 0 ? `About ${formatMinutes(minutes)} to close your gaps.` : 'Nothing left to study. Take the checks.'}</h2></div>{!compact && <span className="small-tag">Diagnostic-based</span>}</div>
    {first.length > 0 ? <div className="plan-grid">{first.map(card)}</div> : <p className="section-intro">No module needs a full study pass. Take the mastery checks to mark modules as mastered, or open any module from the course map.</p>}
    {later.length > 0 && <div className="plan-later">
      <button type="button" className="text-button" aria-expanded={showLater} onClick={() => setShowLater(!showLater)}>Later · {later.length} {later.length === 1 ? 'module' : 'modules'}<ChevronDown className={showLater ? 'rotated' : ''} size={17} aria-hidden="true" /></button>
      {showLater && <div className="plan-grid">{later.map(card)}</div>}
      <div className="print-only plan-grid">{later.map(card)}</div>
    </div>}
  </section>;
}
