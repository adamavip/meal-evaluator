'use client';

import { useEffect, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { Check } from 'lucide-react';
import type { Scene, Tone } from '../lib/content';

// ---------------------------------------------------------------------------
// Storyboard scenes. Each scene kind maps to one of the motion primitives in
// the spec: slab in, connect, stack, split, dim and spotlight, count up, stamp,
// sort. Timings: 150 to 250 ms for entries, 400 to 800 ms for explanatory moves.
// `reduced` renders the final state instantly.
// ---------------------------------------------------------------------------

type Props<K extends Scene['kind']> = { scene: Extract<Scene, { kind: K }>; reduced: boolean };
const toneClass = (tone?: Tone) => `tone-${tone ?? 'paper'}`;
const slab = (i: number, reduced: boolean, step = .16) => ({ initial: reduced ? false as const : { opacity: 0, x: -8, y: -8 }, animate: { opacity: 1, x: 0, y: 0 }, transition: { duration: .18, ease: 'easeOut' as const, delay: reduced ? 0 : i * step } });

export function useCountUp(value: number, reduced: boolean, ms = 600) {
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) { setShown(value); return; }
    let handle = 0;
    const start = performance.now();
    const tick = (now: number) => { const t = Math.min((now - start) / ms, 1); setShown(Math.round(value * (1 - (1 - t) ** 3))); if (t < 1) handle = requestAnimationFrame(tick); };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [value, reduced, ms]);
  return shown;
}

function Stamp({ label, delay = .6, reduced }: { label?: string; delay?: number; reduced: boolean }) {
  if (!label) return null;
  return <motion.span className="scene-stamp" initial={reduced ? false : { opacity: 0, scale: 1.5, rotate: 0 }} animate={{ opacity: 1, scale: 1, rotate: -4 }} transition={{ duration: .22, delay: reduced ? 0 : delay, ease: 'easeOut' }}>{label}</motion.span>;
}

function CountValue({ value, reduced, prefix, suffix }: { value: number; reduced: boolean; prefix?: string; suffix?: string }) {
  const n = useCountUp(value, reduced);
  return <strong className="scene-number">{prefix}{n.toLocaleString()}{suffix}</strong>;
}

function TitleScene({ scene, reduced }: Props<'title'>) {
  return <div className="scene scene-title">
    <motion.h3 {...slab(0, reduced)}>{scene.title}</motion.h3>
    {scene.subtitle && <motion.p {...slab(1, reduced)}>{scene.subtitle}</motion.p>}
    <Stamp label={scene.stamp} reduced={reduced} />
  </div>;
}

function CardsScene({ scene, reduced }: Props<'cards'>) {
  const spot = new Set(scene.spotlight ?? []);
  return <div className={`scene scene-cards layout-${scene.layout ?? 'grid'} count-${scene.items.length}`}>
    {scene.items.map((item, i) => <motion.div key={i} className={`scene-card ${toneClass(item.tone)} ${spot.size && !spot.has(i) ? 'dimmed' : ''} ${spot.has(i) ? 'spot' : ''}`} {...slab(i, reduced)}>
      <strong>{item.label}</strong>{item.detail && <span>{item.detail}</span>}
    </motion.div>)}
    <Stamp label={scene.stamp} reduced={reduced} delay={.2 + scene.items.length * .16} />
  </div>;
}

function Traveler({ count, reduced, vertical }: { count: number; reduced: boolean; vertical?: boolean }) {
  const positions = Array.from({ length: count }, (_, i) => `${(i + .5) / count * 100}%`);
  const key = vertical ? 'top' : 'left';
  return <motion.span className="scene-traveler" aria-hidden="true" initial={reduced ? { [key]: positions[count - 1] } : { [key]: positions[0], opacity: 0 }} animate={reduced ? { [key]: positions[count - 1], opacity: 1 } : { [key]: positions, opacity: 1 }} transition={{ duration: reduced ? 0 : Math.max(1.2, count * .6), ease: 'easeInOut', delay: reduced ? 0 : .6 }} />;
}

function ChainScene({ scene, reduced }: Props<'chain'>) {
  const n = scene.steps.length;
  return <div className={`scene scene-chain count-${n}`}>
    <div className="chain-row">
      {scene.steps.map((step, i) => {
        const link = scene.links?.[i];
        const dim = scene.spotlight !== undefined && scene.spotlight !== i;
        return <div className="chain-cell" key={i}>
          <motion.div className={`scene-card ${toneClass(step.tone)} ${dim ? 'dimmed' : ''} ${scene.spotlight === i ? 'spot' : ''}`} {...slab(i * 2, reduced, .14)}><strong>{step.label}</strong>{step.detail && <span>{step.detail}</span>}</motion.div>
          {i < n - 1 && <div className={`chain-connector ${link?.broken ? 'broken' : ''}`}>
            <motion.span className="chain-line" initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: .4, delay: reduced ? 0 : (i * 2 + 1) * .14, ease: 'easeOut' }} />
            <motion.span className="chain-head" initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ duration: .15, delay: reduced ? 0 : (i * 2 + 1) * .14 + .4 }} />
            {link?.label && <motion.span className={`chain-tag ${link.broken ? 'broken' : ''}`} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : (i * 2 + 1) * .14 + .3 }}>{link.label}</motion.span>}
            {link?.broken && <motion.span className="chain-break" initial={reduced ? false : { scale: 0, rotate: 0 }} animate={{ scale: 1, rotate: -8 }} transition={{ delay: reduced ? 0 : (i * 2 + 2) * .14 + .4, duration: .2 }} aria-label="broken link">✕</motion.span>}
          </div>}
        </div>;
      })}
      {scene.traveler && <Traveler count={n} reduced={reduced} />}
    </div>
    <Stamp label={scene.stamp} reduced={reduced} delay={n * .3 + .3} />
  </div>;
}

function StackScene({ scene, reduced }: Props<'stack'>) {
  const n = scene.layers.length;
  return <div className="scene scene-stack">
    <div className="stack-column">
      {scene.layers.map((layer, i) => {
        const order = n - 1 - i; // bottom layer lands first
        const dim = scene.spotlight !== undefined && scene.spotlight !== i;
        return <motion.div key={i} className={`scene-card stack-layer ${toneClass(layer.tone)} ${dim ? 'dimmed' : ''} ${scene.spotlight === i ? 'spot' : ''}`} initial={reduced ? false : { y: -48, opacity: 0 }} animate={reduced ? { y: 0, opacity: 1 } : { y: [-48, 4, 0], opacity: [0, 1, 1] }} transition={{ duration: .42, delay: reduced ? 0 : order * .28, ease: 'easeOut', times: [0, .8, 1] }}>
          <strong>{layer.label}</strong>{layer.detail && <span>{layer.detail}</span>}
        </motion.div>;
      })}
      {scene.traveler && <Traveler count={n} reduced={reduced} vertical />}
    </div>
    <Stamp label={scene.stamp} reduced={reduced} delay={n * .3 + .3} />
  </div>;
}

function SortScene({ scene, reduced }: Props<'sort'>) {
  // Timeline: card i leaves the tray at i * 700 ms; a card with a wrong bin bounces back 900 ms later.
  const [placement, setPlacement] = useState<('tray' | 'wrong' | 'final')[]>(() => scene.cards.map(() => reduced ? 'final' : 'tray'));
  useEffect(() => {
    if (reduced) { setPlacement(scene.cards.map(() => 'final')); return; }
    const handles: number[] = [];
    scene.cards.forEach((card, i) => {
      const at = 400 + i * 700;
      handles.push(window.setTimeout(() => setPlacement(p => p.map((v, j) => j === i ? (card.wrong !== undefined ? 'wrong' : 'final') : v)), at));
      if (card.wrong !== undefined) handles.push(window.setTimeout(() => setPlacement(p => p.map((v, j) => j === i ? 'final' : v)), at + 900));
    });
    return () => handles.forEach(clearTimeout);
  }, [scene, reduced]);
  const inBin = (b: number) => scene.cards.map((c, i) => ({ c, i })).filter(({ c, i }) => (placement[i] === 'final' && c.bin === b) || (placement[i] === 'wrong' && c.wrong === b));
  const card = ({ c, i }: { c: typeof scene.cards[number]; i: number }) => <motion.div layoutId={`sort-${i}`} key={i} className={`sort-card ${placement[i] === 'wrong' ? 'bounce' : ''}`} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>{c.label}</motion.div>;
  return <LayoutGroup><div className="scene scene-sort">
    <div className="sort-tray" aria-hidden={placement.every(p => p !== 'tray')}>{scene.cards.map((c, i) => placement[i] === 'tray' ? card({ c, i }) : null)}</div>
    <div className={`sort-bins count-${scene.bins.length}`}>{scene.bins.map((bin, b) => <div className="sort-bin" key={b}><span className="sort-bin-label">{bin}</span><div className="sort-bin-body">{inBin(b).map(card)}</div></div>)}</div>
    <Stamp label={scene.stamp} reduced={reduced} delay={.6 + scene.cards.length * .7} />
  </div></LayoutGroup>;
}

function Panel({ side, title, lines, value, tone, reduced, noise }: { side: 'left' | 'right'; title: string; lines: string[]; value?: number; tone?: Tone; reduced: boolean; noise?: boolean }) {
  return <motion.div className={`split-panel ${side} ${toneClass(tone)}`} initial={reduced ? false : { opacity: 0, x: side === 'left' ? -14 : 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .25, delay: reduced ? 0 : .25 }}>
    <strong className="split-title">{title}</strong>
    {value !== undefined && <CountValue value={value} reduced={reduced} />}
    <ul>{lines.map((l, i) => <motion.li key={i} {...slab(i + 2, reduced)}>{l}</motion.li>)}</ul>
    {noise && <span className="split-noise" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ height: `${30 + ((i * 37) % 60)}%` }} />)}</span>}
  </motion.div>;
}

function SplitScene({ scene, reduced }: Props<'split'>) {
  return <div className="scene scene-split">
    <div className="split-row">
      <Panel side="left" {...scene.left} reduced={reduced} noise={scene.noise} />
      <motion.span className="split-cut" aria-hidden="true" initial={reduced ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: .2, ease: 'linear' }} />
      <Panel side="right" {...scene.right} reduced={reduced} noise={scene.noise} />
    </div>
    {scene.gap && <motion.p className="split-gap" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .9 }}>{scene.gap}</motion.p>}
  </div>;
}

function DialScene({ scene, reduced }: Props<'dial'>) {
  const n = scene.segments.length;
  const flagged = new Set(scene.flagged ?? []);
  const angle = -90 + Math.min(1, Math.max(0, scene.value)) * 180;
  return <div className="scene scene-dial">
    <svg viewBox="0 0 220 130" role="img" aria-label={`${scene.label ?? 'Quality'} ${Math.round(scene.value * 100)} percent`}>
      {scene.segments.map((seg, i) => {
        const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI;
        const r = 90, cx = 110, cy = 115;
        const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        return <motion.path key={i} d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`} className={`dial-seg ${flagged.has(i) ? 'flagged' : ''}`} initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .3, delay: reduced ? 0 : i * .12 }}><title>{seg}</title></motion.path>;
      })}
      <motion.line x1="110" y1="115" x2="110" y2="35" className="dial-needle" style={{ originX: '110px', originY: '115px' }} initial={reduced ? false : { rotate: -90 }} animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: 60, damping: 14, delay: reduced ? 0 : .4 }} />
      <circle cx="110" cy="115" r="6" className="dial-pivot" />
    </svg>
    <div className="dial-legend">{scene.segments.map((seg, i) => <span key={i} className={flagged.has(i) ? 'flagged' : ''}><i aria-hidden="true" />{seg}</span>)}</div>
    {scene.label && <p className="dial-label-text">{scene.label}</p>}
  </div>;
}

function FanScene({ scene, reduced }: Props<'fan'>) {
  return <div className="scene scene-fan">
    <motion.div className="scene-card tone-green fan-source" {...slab(0, reduced)}><strong>{scene.source}</strong></motion.div>
    <div className="fan-lines" aria-hidden="true">{scene.branches.map((_, i) => <motion.span key={i} initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: .4, delay: reduced ? 0 : .3 + i * .12 }} />)}</div>
    <div className="fan-branches">{scene.branches.map((b, i) => <motion.div key={i} className="scene-card tone-gold" {...slab(i + 2, reduced, .12)}><strong>{b.label}</strong>{b.detail && <span>{b.detail}</span>}</motion.div>)}</div>
    <div className="fan-lines" aria-hidden="true">{scene.branches.map((_, i) => <motion.span key={i} initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: .4, delay: reduced ? 0 : .9 + i * .12 }} />)}</div>
    <motion.div className="scene-card tone-sky fan-target" initial={reduced ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduced ? 0 : 1.3, duration: .2 }}><strong>{scene.target}</strong></motion.div>
  </div>;
}

function CompassScene({ scene, reduced }: Props<'compass'>) {
  const active = new Set(scene.active ?? []);
  const positions = ['north', 'east', 'south', 'west'];
  return <div className="scene scene-compass">
    <div className="compass-board">
      <span className="compass-center" aria-hidden="true">MEAL</span>
      {scene.directions.map((d, i) => <motion.div key={i} className={`scene-card compass-dir ${positions[i]} ${active.has(i) ? 'tone-green lit' : 'tone-paper'}`} initial={reduced ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .2, delay: reduced ? 0 : .15 * i }}><strong>{d.label}</strong>{d.detail && <span>{d.detail}</span>}</motion.div>)}
      {positions.map((p, i) => <motion.span key={p} className={`compass-line ${p} ${active.has(i) ? 'lit' : ''}`} aria-hidden="true" initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ duration: .4, delay: reduced ? 0 : .5 + i * .15 }} />)}
    </div>
  </div>;
}

function GridScene({ scene, reduced }: Props<'grid'>) {
  return <LayoutGroup><div className="scene scene-grid">
    <table className="grid-table"><thead><tr><th scope="col"><span className="sr-only">Row</span></th>{scene.cols.map((c, i) => <th scope="col" key={i}>{c}</th>)}</tr></thead>
      <tbody>{scene.rows.map((r, ri) => <tr key={ri}><th scope="row">{r}</th>{scene.cols.map((_, ci) => <td key={ci} className={scene.token && scene.token.row === ri && scene.token.col === ci ? 'has-token' : ''}>
        <motion.span className="grid-cell-text" {...slab(ri * scene.cols.length + ci, reduced, .05)}>{scene.cells?.[ri]?.[ci] ?? ''}</motion.span>
        {scene.token && scene.token.row === ri && scene.token.col === ci && <motion.span layoutId="grid-token" className="grid-token" transition={{ type: 'spring', stiffness: 300, damping: 28 }}>{scene.token.label ?? '●'}</motion.span>}
      </td>)}</tr>)}</tbody></table>
    {scene.counter && <div className="grid-counter"><span>{scene.counter.label}</span><CountValue value={scene.counter.value} reduced={reduced} /></div>}
  </div></LayoutGroup>;
}

function LoopScene({ scene, reduced }: Props<'loop'>) {
  const n = scene.steps.length;
  return <div className="scene scene-loop">
    <div className="loop-ring">
      <svg viewBox="0 0 200 200" aria-hidden="true"><motion.circle cx="100" cy="100" r="78" className="loop-track" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .8, ease: 'easeOut' }} /></svg>
      {scene.steps.map((s, i) => {
        const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
        return <motion.div key={i} className={`scene-card loop-step ${scene.active === i ? 'tone-green spot' : 'tone-paper'} ${scene.active !== undefined && scene.active !== i ? 'dimmed' : ''}`} style={{ left: `${50 + 39 * Math.cos(a)}%`, top: `${50 + 39 * Math.sin(a)}%` }} {...slab(i, reduced, .14)}><strong>{s.label}</strong>{s.detail && <span>{s.detail}</span>}</motion.div>;
      })}
    </div>
    {scene.log && <motion.p className="loop-log" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .9 }}><span className="micro">Log</span>{scene.log}</motion.p>}
  </div>;
}

function CounterScene({ scene, reduced }: Props<'counter'>) {
  return <div className="scene scene-counter">
    <div className={`counter-row count-${scene.items.length}`}>{scene.items.map((item, i) => <motion.div key={i} className={`scene-card ${toneClass(item.tone)}`} {...slab(i, reduced, .2)}><CountValue value={item.value} reduced={reduced} prefix={item.prefix} suffix={item.suffix} /><span>{item.label}</span></motion.div>)}</div>
    {scene.note && <motion.p className="scene-note" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : .8 }}>{scene.note}</motion.p>}
  </div>;
}

function DissolveScene({ scene, reduced }: Props<'dissolve'>) {
  return <div className="scene scene-dissolve">
    <div className="dissolve-reports">{scene.from.map((r, i) => <motion.div key={i} className="scene-card tone-paper report-card" initial={reduced ? { opacity: .35 } : { opacity: 1, y: 0 }} animate={{ opacity: .35, y: -4 }} transition={{ delay: reduced ? 0 : .9 + i * .15, duration: .5 }}><strong>{r}</strong><span>PDF</span></motion.div>)}</div>
    <motion.span className="dissolve-arrow" aria-hidden="true" initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: reduced ? 0 : .8, duration: .4 }} />
    <div className="dissolve-plots"><div className="plot-grid" aria-hidden="true">{Array.from({ length: scene.to.dots }, (_, i) => <motion.i key={i} initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: reduced ? 0 : 1.1 + i * .035, duration: .15 }} />)}</div><strong>{scene.to.label}</strong></div>
  </div>;
}

function ChecklistScene({ scene, reduced }: Props<'checklist'>) {
  return <div className="scene scene-checklist">
    <ul>{scene.items.map((item, i) => <motion.li key={i} className={item.done ? 'done' : ''} {...slab(i, reduced, .12)}><span className="check-box" aria-hidden="true">{item.done && <Check size={14} strokeWidth={3} />}</span><span>{item.label}</span><span className="sr-only">{item.done ? ' (done)' : ' (missing)'}</span></motion.li>)}</ul>
    <Stamp label={scene.stamp} reduced={reduced} delay={.4 + scene.items.length * .12} />
  </div>;
}

export function SceneView({ scene, reduced }: { scene: Scene; reduced: boolean }) {
  switch (scene.kind) {
    case 'title': return <TitleScene scene={scene} reduced={reduced} />;
    case 'cards': return <CardsScene scene={scene} reduced={reduced} />;
    case 'chain': return <ChainScene scene={scene} reduced={reduced} />;
    case 'stack': return <StackScene scene={scene} reduced={reduced} />;
    case 'sort': return <SortScene scene={scene} reduced={reduced} />;
    case 'split': return <SplitScene scene={scene} reduced={reduced} />;
    case 'dial': return <DialScene scene={scene} reduced={reduced} />;
    case 'fan': return <FanScene scene={scene} reduced={reduced} />;
    case 'compass': return <CompassScene scene={scene} reduced={reduced} />;
    case 'grid': return <GridScene scene={scene} reduced={reduced} />;
    case 'loop': return <LoopScene scene={scene} reduced={reduced} />;
    case 'counter': return <CounterScene scene={scene} reduced={reduced} />;
    case 'dissolve': return <DissolveScene scene={scene} reduced={reduced} />;
    case 'checklist': return <ChecklistScene scene={scene} reduced={reduced} />;
  }
}
