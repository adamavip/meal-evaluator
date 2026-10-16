'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUp, Check, CircleCheck, CircleX, RotateCcw, X } from 'lucide-react';
import type { Widget } from '../lib/content';
import { PERSONAS } from '../lib/content';
import { useLearner } from './LearnerProvider';
import { useCountUp } from './Scene';

// ---------------------------------------------------------------------------
// Interactive worked examples. All keyboard-operable: no drag and drop.
// ---------------------------------------------------------------------------

function Sorter({ prompt, bins, cards }: Extract<Widget, { widget: 'sorter' }>) {
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(0);
  const done = Object.keys(placed).length === cards.length;
  const correct = cards.filter((c, i) => placed[i] === c.bin).length;
  const card = cards[current];
  function place(binId: string) {
    setPlaced({ ...placed, [current]: binId });
    const next = cards.findIndex((_, i) => i !== current && placed[i] === undefined);
    if (next >= 0) setCurrent(next);
  }
  return <div className="widget sorter">
    <p className="widget-prompt">{prompt}</p>
    {!done && card && <div className="sorter-current paper" role="group" aria-label={`Card ${current + 1} of ${cards.length}`}>
      <span className="micro">Card {Object.keys(placed).length + 1} of {cards.length}</span>
      <strong className="sorter-card-text">{card.label}</strong>
      <div className={`sorter-bins count-${bins.length}`}>{bins.map(bin => <button type="button" key={bin.id} className="sorter-bin button secondary" onClick={() => place(bin.id)}><strong>{bin.label}</strong>{bin.hint && <span>{bin.hint}</span>}</button>)}</div>
    </div>}
    <ol className="sorter-results" aria-live="polite">{cards.map((c, i) => placed[i] === undefined ? null : <li key={i} className={placed[i] === c.bin ? 'good' : 'bad'}>
      {placed[i] === c.bin ? <CircleCheck size={18} aria-hidden="true" /> : <CircleX size={18} aria-hidden="true" />}
      <div><strong>{c.label}</strong><span>{placed[i] === c.bin ? `${bins.find(b => b.id === c.bin)?.label}. ` : `You chose ${bins.find(b => b.id === placed[i])?.label}; it belongs in ${bins.find(b => b.id === c.bin)?.label}. `}{c.why}</span></div>
    </li>)}</ol>
    {done && <div className="widget-done"><strong>{correct} of {cards.length} sorted correctly.</strong><button type="button" className="text-button" onClick={() => { setPlaced({}); setCurrent(0); }}><RotateCcw size={15} aria-hidden="true" />Sort again</button></div>}
  </div>;
}

function Order({ prompt, items, why }: Extract<Widget, { widget: 'order' }>) {
  const scrambled = useMemo(() => {
    // Deterministic scramble so the first render matches on the server and the client.
    const out = items.map((_, i) => i);
    for (let i = out.length - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
    return out.join('') === items.map((_, i) => i).join('') ? out.reverse() : out;
  }, [items]);
  const [order, setOrder] = useState(scrambled);
  const [checked, setChecked] = useState(false);
  function move(from: number, to: number) { if (to < 0 || to >= order.length) return; const next = [...order]; [next[from], next[to]] = [next[to], next[from]]; setOrder(next); setChecked(false); }
  const correct = order.filter((v, i) => v === i).length;
  return <div className="widget order-widget">
    <p className="widget-prompt">{prompt}</p>
    <ol className="order-list">{order.map((itemIndex, pos) => <li key={itemIndex} className={checked ? (itemIndex === pos ? 'good' : 'bad') : ''}>
      <span className="order-pos" aria-hidden="true">{pos + 1}</span>
      <div><strong>{items[itemIndex].label}</strong>{items[itemIndex].detail && <span>{items[itemIndex].detail}</span>}</div>
      <span className="order-buttons"><button type="button" aria-label={`Move "${items[itemIndex].label}" up`} disabled={pos === 0} onClick={() => move(pos, pos - 1)}><ArrowUp size={16} aria-hidden="true" /></button><button type="button" aria-label={`Move "${items[itemIndex].label}" down`} disabled={pos === order.length - 1} onClick={() => move(pos, pos + 1)}><ArrowDown size={16} aria-hidden="true" /></button></span>
      {checked && (itemIndex === pos ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />)}
    </li>)}</ol>
    <div className="widget-actions"><button type="button" className="button primary" onClick={() => setChecked(true)}>Check order</button>{checked && <span role="status">{correct === order.length ? 'All in order.' : `${correct} of ${order.length} in the right place.`}</span>}</div>
    {checked && correct === order.length && <p className="widget-why">{why}</p>}
  </div>;
}

function Branch({ prompt, start, nodes }: Extract<Widget, { widget: 'branch' }>) {
  const [path, setPath] = useState<{ node: string; choice?: number }[]>([{ node: start }]);
  const step = path[path.length - 1];
  const node = nodes[step.node];
  const chosen = step.choice !== undefined ? node.choices?.[step.choice] : undefined;
  return <div className="widget branch">
    <p className="widget-prompt">{prompt}</p>
    <ol className="branch-trail" aria-label="Your path so far">{path.slice(0, -1).map((p, i) => <li key={i}><span>{nodes[p.node].choices?.[p.choice!]?.label}</span></li>)}</ol>
    <AnimatePresence mode="wait"><motion.div key={step.node} className="branch-node paper" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
      <p className="branch-text">{node.text}</p>
      {node.choices && !chosen && <div className="branch-choices">{node.choices.map((c, i) => <button type="button" key={i} className="button secondary" onClick={() => setPath([...path.slice(0, -1), { ...step, choice: i }])}>{c.label}</button>)}</div>}
      {chosen && <div className={`branch-feedback ${chosen.good ? 'good' : 'bad'}`} role="status"><p>{chosen.good ? <CircleCheck size={18} aria-hidden="true" /> : <CircleX size={18} aria-hidden="true" />}{chosen.feedback}</p><button type="button" className="button primary" onClick={() => setPath([...path, { node: chosen.next }])}>Continue</button></div>}
      {node.end && <div className="widget-done"><strong>End of scenario.</strong><button type="button" className="text-button" onClick={() => setPath([{ node: start }])}><RotateCcw size={15} aria-hidden="true" />Start again</button></div>}
    </motion.div></AnimatePresence>
  </div>;
}

function Dial({ prompt, dimensions }: Extract<Widget, { widget: 'dial' }>) {
  const reduced = Boolean(useReducedMotion());
  const [fixed, setFixed] = useState<boolean[]>(dimensions.map(() => false));
  const value = fixed.filter(Boolean).length / dimensions.length;
  const percent = useCountUp(Math.round(value * 100), reduced, 400);
  return <div className="widget dial-widget">
    <p className="widget-prompt">{prompt}</p>
    <div className="dial-widget-row">
      <div className="scene scene-dial static" aria-hidden="true">
        <svg viewBox="0 0 220 130">{dimensions.map((_, i) => { const n = dimensions.length, a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI, r = 90; return <path key={i} d={`M ${110 + r * Math.cos(a0)} ${115 + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${110 + r * Math.cos(a1)} ${115 + r * Math.sin(a1)}`} className={`dial-seg ${fixed[i] ? '' : 'flagged'}`} />; })}
          <motion.line x1="110" y1="115" x2="110" y2="35" className="dial-needle" style={{ originX: '110px', originY: '115px' }} animate={{ rotate: -90 + value * 180 }} transition={{ type: 'spring', stiffness: 60, damping: 14 }} /><circle cx="110" cy="115" r="6" className="dial-pivot" /></svg>
        <p className="dial-readout"><strong>{percent}%</strong> fit for use</p>
      </div>
      <ul className="dial-list">{dimensions.map((d, i) => <li key={i} className={fixed[i] ? 'fixed' : ''}>
        <div><strong>{d.label}</strong><span>{fixed[i] ? d.fix : d.problem}</span></div>
        <button type="button" className="button secondary" aria-pressed={fixed[i]} onClick={() => setFixed(fixed.map((f, j) => j === i ? !f : f))}>{fixed[i] ? 'Undo' : 'Fix it'}</button>
      </li>)}</ul>
    </div>
    <p className="sr-only" role="status">Quality {Math.round(value * 100)} percent, {fixed.filter(Boolean).length} of {dimensions.length} dimensions fixed.</p>
  </div>;
}

// Annex A and section 5.10 of the framework, verbatim figures.
const PROJECT_TYPES = [
  { id: 'upstream', label: 'Upstream discovery science', complexity: 0, kpis: '21 KPIs (15 output / 6 outcome / 0 impact)' },
  { id: 'breeding', label: 'Breeding and varietal development', complexity: 1, kpis: '76 KPIs (35 / 30 / 11)' },
  { id: 'agronomy', label: 'Applied agronomy and farming systems', complexity: 2, kpis: '85 KPIs (34 / 36 / 15)' },
  { id: 'seed', label: 'Seed systems and deployment', complexity: 2, kpis: '93 KPIs (39 / 39 / 15)' },
  { id: 'digital', label: 'Digital agriculture and AI', complexity: 1, kpis: '65 KPIs (26 / 28 / 11)' },
  { id: 'systems', label: 'System change and transformation', complexity: 2, kpis: '93 KPIs (38 / 39 / 16)' },
];
const COMPLEXITY = ['Standard', 'Intermediate', 'Complex'];
const SMALL_BUDGET = [8000, 13000, 18000];
const MEDIUM_RATE = [0.03, 0.04, 0.05];
const SCALES = [
  { id: 'small', label: 'Small', detail: 'Up to about USD 280,000; around one year' },
  { id: 'medium', label: 'Medium', detail: 'About USD 280,000 to 800,000; 1.5 to 3 years' },
  { id: 'large', label: 'Large', detail: 'Above USD 800,000 and up to USD 10 million; multi-country and/or multi-year' },
  { id: 'mega', label: 'MEGA', detail: 'Above USD 10 million; flagship, multi-country, multi-year' },
];
const TRIGGERS = ['Commits to report farmer- or household-level adoption, outcomes or impact to investors', 'Runs its own ground measurement of outcomes', 'Depends on primary data from several implementing partners'];
const usd = (n: number) => `USD ${n.toLocaleString('en-US')}`;

export function budgetLine(scale: string, complexity: number, total: number | null): { amount: string; detail: string } {
  if (scale === 'small') return { amount: usd(SMALL_BUDGET[complexity]), detail: `Small projects budget a fixed amount by complexity: ${COMPLEXITY[complexity]} is ${usd(SMALL_BUDGET[complexity])} per project for its lifetime.` };
  if (scale === 'medium') {
    const rate = MEDIUM_RATE[complexity];
    const floor = SMALL_BUDGET[complexity];
    if (!total) return { amount: `${Math.round(rate * 100)}% of the total budget, never less than ${usd(floor)}`, detail: 'Enter the total project budget to compute the amount. Medium projects confirm the figure with MEAL during proposal writing.' };
    const pct = Math.round(total * rate);
    const amount = Math.max(pct, floor);
    return { amount: usd(amount), detail: `${Math.round(rate * 100)}% of ${usd(total)} is ${usd(pct)}. ${pct < floor ? `That is below the Small ${COMPLEXITY[complexity]} amount of ${usd(floor)}, so the minimum applies.` : `That is at or above the Small ${COMPLEXITY[complexity]} amount of ${usd(floor)}, so the percentage applies.`} Confirmed with MEAL during proposal writing.` };
  }
  if (scale === 'large') return { amount: 'Co-designed with MEAL', detail: 'Large projects co-design MEAL with the team from the start of proposal development. The framework does not set a single fixed minimum for Large projects.' };
  return { amount: 'Co-designed, plus at least USD 27,000 per project year', detail: 'MEGA budgets cover project-specific MEAL work and an institutional contribution, charged as Core Layer staff time, of at least USD 27,000 per project year.' };
}

function Matrix({ prompt }: Extract<Widget, { widget: 'matrix' }>) {
  const [type, setType] = useState(PROJECT_TYPES[2].id);
  const [scale, setScale] = useState('medium');
  const [triggers, setTriggers] = useState<boolean[]>(TRIGGERS.map(() => false));
  const [total, setTotal] = useState('300000');
  const t = PROJECT_TYPES.find(p => p.id === type)!;
  const bumped = triggers.some(Boolean);
  const complexity = Math.min(2, t.complexity + (bumped ? 1 : 0));
  const capped = bumped && t.complexity === 2;
  const budget = budgetLine(scale, complexity, scale === 'medium' ? Number(total) || null : null);
  return <div className="widget matrix-widget">
    <p className="widget-prompt">{prompt}</p>
    <div className="matrix-form">
      <label>Project type<select value={type} onChange={e => setType(e.target.value)}>{PROJECT_TYPES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <label>Scale<select value={scale} onChange={e => setScale(e.target.value)}>{SCALES.map(s => <option key={s.id} value={s.id}>{s.label}: {s.detail}</option>)}</select></label>
      {scale === 'medium' && <label>Total project budget (USD)<input type="number" min={0} step={1000} value={total} onChange={e => setTotal(e.target.value)} /></label>}
      <fieldset className="matrix-triggers"><legend>Adjustment rule: does the project…</legend>{TRIGGERS.map((tr, i) => <label key={i}><input type="checkbox" checked={triggers[i]} onChange={() => setTriggers(triggers.map((v, j) => j === i ? !v : v))} />{tr}</label>)}</fieldset>
    </div>
    <div className="matrix-result paper" aria-live="polite">
      <div className="matrix-row"><span className="micro">Default complexity</span><strong>{COMPLEXITY[t.complexity]}</strong><span>{t.kpis} apply to this type</span></div>
      <div className="matrix-row"><span className="micro">After adjustment</span><strong className="matrix-stamp">{COMPLEXITY[complexity]}</strong><span>{bumped ? (capped ? 'The adjustment rule moves a project up one level; the Matrix names no level above Complex.' : 'Moved up one level by the adjustment rule.') : 'No trigger applies; the default stands.'}</span></div>
      <div className="matrix-row"><span className="micro">Base MEAL budget</span><strong>{budget.amount}</strong><span>{budget.detail}</span></div>
      <p className="matrix-note">The Regional MEAL Lead confirms the classification at proposal review (§5.3, Annex A). Small projects can proceed directly with the standard package; Medium confirm the budget with MEAL; Large and MEGA co-design from the start.</p>
    </div>
  </div>;
}

function Budget({ prompt }: Extract<Widget, { widget: 'budget' }>) {
  const [scale, setScale] = useState('medium');
  const [complexity, setComplexity] = useState(2);
  const [total, setTotal] = useState('300000');
  const budget = budgetLine(scale, complexity, scale === 'medium' ? Number(total) || null : null);
  return <div className="widget budget-widget">
    <p className="widget-prompt">{prompt}</p>
    <div className="matrix-form">
      <label>Scale<select value={scale} onChange={e => setScale(e.target.value)}>{SCALES.map(s => <option key={s.id} value={s.id}>{s.label}: {s.detail}</option>)}</select></label>
      <label>M&amp;E complexity<select value={complexity} onChange={e => setComplexity(Number(e.target.value))}>{COMPLEXITY.map((c, i) => <option key={c} value={i}>{c}</option>)}</select></label>
      {scale === 'medium' && <label>Total project budget (USD)<input type="number" min={0} step={1000} value={total} onChange={e => setTotal(e.target.value)} /></label>}
    </div>
    <div className="matrix-result paper" aria-live="polite"><div className="matrix-row"><span className="micro">Base MEAL contribution</span><strong className="matrix-stamp">{budget.amount}</strong><span>{budget.detail}</span></div>
      <table className="budget-table"><caption className="sr-only">Base MEAL budget by scale and complexity (section 5.10)</caption><thead><tr><th scope="col">Scale</th><th scope="col">Standard</th><th scope="col">Intermediate</th><th scope="col">Complex</th></tr></thead><tbody>
        <tr><th scope="row">Small</th><td>USD 8,000</td><td>USD 13,000</td><td>USD 18,000</td></tr>
        <tr><th scope="row">Medium</th><td>3%</td><td>4%</td><td>5%</td></tr>
        <tr><th scope="row">Large</th><td colSpan={3}>Co-designed with MEAL from the start of proposal development</td></tr>
        <tr><th scope="row">MEGA</th><td colSpan={3}>Co-designed; institutional contribution of at least USD 27,000 per project year</td></tr>
      </tbody></table><p className="matrix-note">Medium percentages are of the total project budget and never less than the Small amount for the same complexity level.</p></div>
  </div>;
}

function Persona({ prompt }: Extract<Widget, { widget: 'persona' }>) {
  const { state, update } = useLearner();
  return <div className="widget persona-widget">
    <p className="widget-prompt">{prompt}</p>
    <div className="persona-grid" role="radiogroup" aria-label="Your role">{PERSONAS.map(p => <label key={p.id} className={`persona-card paper ${state.persona === p.id ? 'selected' : ''}`}>
      <input type="radio" name="persona" value={p.id} checked={state.persona === p.id} onChange={() => update(s => ({ ...s, persona: p.id }))} />
      <strong>{p.label}</strong><span>{p.blurb}</span>{state.persona === p.id && <Check size={18} aria-hidden="true" className="persona-check" />}
    </label>)}</div>
    <p className="widget-why" role="status">{state.persona ? `Saved. Scenarios aimed at ${PERSONAS.find(p => p.id === state.persona)?.label.toLowerCase()}s will be highlighted.` : 'Pick one to save it in this browser.'}</p>
  </div>;
}

export function WidgetView({ widget }: { widget: Widget }) {
  switch (widget.widget) {
    case 'sorter': return <Sorter {...widget} />;
    case 'order': return <Order {...widget} />;
    case 'branch': return <Branch {...widget} />;
    case 'dial': return <Dial {...widget} />;
    case 'matrix': return <Matrix {...widget} />;
    case 'budget': return <Budget {...widget} />;
    case 'persona': return <Persona {...widget} />;
  }
}
