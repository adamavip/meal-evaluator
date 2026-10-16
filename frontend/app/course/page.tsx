'use client';

import Link from 'next/link';
import { ArrowUpRight, Award, Clock, Download, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useLearner } from '../../components/LearnerProvider';
import { Loading, StatusStamp, TopicIcon, usePageFocus } from '../../components/ui';
import { BANK } from '../../lib/bank';
import { COURSE_MODULES, CAPSTONE, LESSONS, MODULES, modulePath } from '../../lib/content';
import { allMastered, completedLessonIds, exportLearner, importLearner, isMastered, masteredCount } from '../../lib/learner';
import { topicById } from '../../lib/topics';
import type { TopicId } from '../../lib/topics';

const LESSON_IDS = new Set(LESSONS.map(l => l.id));

export default function CoursePage() {
  const { state, hydrated, replace, confirm } = useLearner();
  const fileRef = useRef<HTMLInputElement>(null);
  usePageFocus();
  if (!hydrated) return <Loading />;
  const completed = completedLessonIds(state);
  const mastered = masteredCount(state);
  function download() {
    const blob = new Blob([exportLearner(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `CIMMYT-MEAL-learning-record-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function onImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const next = importLearner(text, BANK, LESSON_IDS);
      if (!next) { window.alert('That file is not a valid learning record for this bank version.'); return; }
      confirm({ title: 'Replace your progress with this record?', body: 'Everything saved in this browser will be replaced by the imported record.', confirmLabel: 'Import', onConfirm: () => replace(next) });
    });
    event.target.value = '';
  }
  return <section className="course-map">
    <div className="section-heading"><div><p className="eyebrow">Course map</p><h1 tabIndex={-1} data-page-heading>Every module. Any order.</h1><p className="section-intro">{mastered} of {COURSE_MODULES.length} modules mastered. Nothing is locked: open any module, lesson or check. Your plan suggests where to start.</p></div>
      <div className="course-actions no-print"><button type="button" className="button secondary" onClick={download}><Download size={16} aria-hidden="true" />Export my learning record</button><button type="button" className="button secondary" onClick={() => fileRef.current?.click()}><Upload size={16} aria-hidden="true" />Import</button><input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={onImport} aria-label="Import a learning record" /></div></div>
    <div className="module-grid">
      {MODULES.map(module => {
        const topic = module.assessed ? topicById(module.id) : null;
        const done = module.lessons.filter(l => completed.has(l.id)).length;
        const entry = module.assessed && state.plan ? state.plan[module.id as TopicId] : null;
        const masteredHere = module.assessed && isMastered(state, module.id as TopicId);
        return <Link key={module.id} href={modulePath(module.id)} className={`module-card paper ${topic?.color ?? 'paper'} ${masteredHere ? 'is-mastered' : ''}`}>
          <div className="module-card-top"><span className="icon-box"><TopicIcon name={topic?.icon ?? 'award'} size={18} /></span><span className="micro">M{module.order}</span>{masteredHere ? <StatusStamp status="mastered" small /> : entry ? <StatusStamp status={entry.known ? 'known' : entry.status} small /> : !module.assessed ? <span className="small-tag">Not assessed</span> : null}</div>
          <h2>{module.title}</h2>
          <p>{module.scenario.title}</p>
          <div className="module-card-foot"><span><Clock size={13} aria-hidden="true" />{module.minutes} min</span><span>{done} / {module.lessons.length} lessons</span><ArrowUpRight size={18} aria-hidden="true" /></div>
          <span className="module-progress" aria-hidden="true"><i style={{ width: `${module.lessons.length ? done / module.lessons.length * 100 : 0}%` }} /></span>
        </Link>;
      })}
      <Link href="/capstone/" className={`module-card paper capstone-card ${state.capstone ? 'is-mastered' : ''}`}>
        <div className="module-card-top"><span className="icon-box"><Award size={18} aria-hidden="true" /></span><span className="micro">Capstone</span>{state.capstone ? <StatusStamp status="mastered" small /> : <span className="small-tag">{allMastered(state) ? 'Ready' : 'Open any time'}</span>}</div>
        <h2>{CAPSTONE.title}</h2><p>{CAPSTONE.project.name}</p>
        <div className="module-card-foot"><span><Clock size={13} aria-hidden="true" />20 min</span><span>{CAPSTONE.decisions.length} decisions</span><ArrowUpRight size={18} aria-hidden="true" /></div>
      </Link>
    </div>
  </section>;
}
