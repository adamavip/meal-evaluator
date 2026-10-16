'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Download, Search } from 'lucide-react';
import { SourceNote, TopicIcon, usePageFocus } from '../../components/ui';
import { BANK } from '../../lib/bank';
import { COURSE_MODULES, objectiveById } from '../../lib/content';
import { TOPICS, topicById } from '../../lib/topics';

const POOLS = [['all', 'All pools'], ['diagnostic', 'Diagnostic'], ['practice', 'Practice (micro-checks)'], ['check', 'Mastery check']] as const;

export default function BankPage() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [pool, setPool] = useState('all');
  const [objective, setObjective] = useState('all');
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);
  usePageFocus();
  const objectives = topic === 'all' ? [] : COURSE_MODULES.find(m => m.id === topic)?.objectives ?? [];
  const filtered = BANK.questions.filter(q => (topic === 'all' || q.topicId === topic) && (pool === 'all' || q.pool === pool) && (objective === 'all' || q.objectiveIds.includes(objective)) && `${q.question} ${q.options.map(o => o.text).join(' ')} ${topicById(q.topicId).title}`.toLowerCase().includes(query.toLowerCase().trim()));
  const pages = Math.ceil(filtered.length / 10);
  const reset = () => setPage(0);
  return <section className="bank-page">
    <Link className="text-button back-link" href="/"><ArrowLeft size={17} aria-hidden="true" />Home</Link>
    <div className="section-heading"><div><p className="eyebrow">The question dictionary</p><h1 tabIndex={-1} data-page-heading>Read. Think. Check.</h1><p className="section-intro">{BANK.questions.length} questions in three pools, with answers, explanations, objectives and framework references. The diagnostic draws only from the diagnostic pool; mastery checks only from the check pool.</p></div><a className="button secondary" download="CIMMYT-MEAL-question-bank.json" href="/question-bank.json"><Download size={17} aria-hidden="true" />Download bank</a></div>
    <div className="bank-filters paper four">
      <div className="search-field"><label htmlFor="search-bank">Search questions</label><div><Search size={19} aria-hidden="true" /><input type="search" id="search-bank" placeholder="Try adoption, evidence or accountability" value={query} onChange={event => { setQuery(event.target.value); reset(); }} /></div></div>
      <div className="topic-select"><label htmlFor="topic-filter">Topic</label><div><select id="topic-filter" value={topic} onChange={event => { setTopic(event.target.value); setObjective('all'); reset(); }}><option value="all">All 10 topics</option>{TOPICS.map(t => <option value={t.id} key={t.id}>{t.title}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></div></div>
      <div className="topic-select"><label htmlFor="pool-filter">Pool</label><div><select id="pool-filter" value={pool} onChange={event => { setPool(event.target.value); reset(); }}>{POOLS.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></div></div>
      <div className="topic-select"><label htmlFor="objective-filter">Objective</label><div><select id="objective-filter" value={objective} disabled={topic === 'all'} onChange={event => { setObjective(event.target.value); reset(); }}><option value="all">{topic === 'all' ? 'Choose a topic first' : 'All objectives'}</option>{objectives.map(o => <option value={o.id} key={o.id}>{o.id.split('.')[1]}: {o.text}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></div></div>
    </div>
    <div className="bank-count" role="status">{filtered.length} {filtered.length === 1 ? 'question' : 'questions'}{filtered.length > 10 && ` · showing ${page * 10 + 1}–${Math.min(page * 10 + 10, filtered.length)}`}</div>
    <div className="bank-list">{filtered.slice(page * 10, page * 10 + 10).map(q => {
      const open = revealed.includes(q.id);
      const t = topicById(q.topicId);
      return <article className="bank-card paper" key={q.id}><div className="review-card-top"><span className={`label-chip ${t.color}`}><TopicIcon name={t.icon} size={15} />{t.title}</span><span className="micro">{q.id} · {q.difficulty} · {q.pool}</span></div><h2>{q.question}</h2><ol className="bank-options" type="A">{q.options.map(o => <li key={o.id} className={open && o.id === q.correctOptionId ? 'bank-correct' : ''}>{o.text}{open && o.id === q.correctOptionId && <span className="bank-correct-mark"><Check size={16} aria-hidden="true" />Correct</span>}</li>)}</ol><button className="text-button reveal-button" aria-expanded={open} aria-controls={`answer-${q.id}`} onClick={() => setRevealed(open ? revealed.filter(id => id !== q.id) : [...revealed, q.id])}>{open ? 'Hide explanation' : 'Check the answer'}<ChevronDown className={open ? 'rotated' : ''} size={17} aria-hidden="true" /></button><AnimatePresence>{open && <motion.div id={`answer-${q.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .2 }} className="bank-explanation"><div><p>{q.explanation}</p><p className="review-tip"><strong>Try this:</strong> {q.reviewTip}</p><p className="review-tip"><strong>Objectives:</strong> {q.objectiveIds.map(id => objectiveById(id)?.text ?? id).join(' · ')}</p><SourceNote question={q} /></div></motion.div>}</AnimatePresence></article>;
    })}</div>
    {!filtered.length && <div className="empty-state paper"><Search size={30} aria-hidden="true" /><h2>No matching questions.</h2><p>Try another search or widen the filters.</p><button className="button secondary" onClick={() => { setQuery(''); setTopic('all'); setPool('all'); setObjective('all'); }}>Clear filters</button></div>}
    {pages > 1 && <nav className="bank-pagination" aria-label="Question bank pages"><button className="button secondary" disabled={page === 0} onClick={() => { setPage(page - 1); document.querySelector('.bank-filters')?.scrollIntoView({ block: 'start' }); }}><ArrowLeft size={17} aria-hidden="true" />Previous</button><span>Page {page + 1} of {pages}</span><button className="button secondary" disabled={page >= pages - 1} onClick={() => { setPage(page + 1); document.querySelector('.bank-filters')?.scrollIntoView({ block: 'start' }); }}>Next<ArrowRight size={17} aria-hidden="true" /></button></nav>}
  </section>;
}
