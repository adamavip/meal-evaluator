'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { Storyboard } from '../lib/content';
import { SceneView } from './Scene';

/**
 * Storyboard player. Frames are learner-paced (segmenting), the caption shows the
 * narration (signalling), and the transcript is always visible below. With reduced
 * motion, frames render as stills and autoplay is off.
 */
export function Explainer({ storyboard, poster }: { storyboard: Storyboard; poster?: string }) {
  const reduced = Boolean(useReducedMotion());
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0); // bumps to replay a frame's animation
  const viewport = useRef<HTMLDivElement>(null);
  const frames = storyboard.frames;
  const frame = frames[index];
  const total = frames.reduce((n, f) => n + f.seconds, 0);

  const goTo = useCallback((next: number) => { setIndex(Math.max(0, Math.min(frames.length - 1, next))); setRun(r => r + 1); }, [frames.length]);

  useEffect(() => {
    if (!playing) return;
    const handle = window.setTimeout(() => {
      if (index >= frames.length - 1) setPlaying(false); else goTo(index + 1);
    }, frame.seconds * 1000);
    return () => window.clearTimeout(handle);
  }, [playing, index, frame.seconds, frames.length, goTo]);

  function onKey(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1); }
    if (event.key === ' ' && event.target === viewport.current) { event.preventDefault(); setPlaying(p => !p); }
  }

  return <div className="explainer">
    <div className="explainer-viewport paper" ref={viewport} tabIndex={0} role="group" aria-roledescription="animated explainer" aria-label={`${storyboard.title}, frame ${index + 1} of ${frames.length}`} onKeyDown={onKey}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${frame.id}-${run}`} className="explainer-frame" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .14 }}>
          <SceneView scene={frame.scene} reduced={reduced} />
        </motion.div>
      </AnimatePresence>
      <div className="explainer-progress" aria-hidden="true">{frames.map((f, i) => <span key={f.id} className={i < index ? 'done' : i === index ? 'current' : ''} style={{ flex: f.seconds }}>{i === index && playing && !reduced && <motion.i key={`${f.id}-${run}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: f.seconds, ease: 'linear' }} />}</span>)}</div>
    </div>
    <p className="explainer-caption" aria-live="polite"><span className="micro">{index + 1} / {frames.length}</span>{frame.narration}</p>
    <div className="explainer-controls">
      <button type="button" className="button secondary" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous frame"><ChevronLeft size={18} aria-hidden="true" />Back</button>
      {!reduced && <button type="button" className="button primary" onClick={() => { if (index >= frames.length - 1 && !playing) goTo(0); setPlaying(p => !p); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}{playing ? 'Pause' : index >= frames.length - 1 ? 'Replay' : 'Play'}</button>}
      <button type="button" className="button secondary" onClick={() => setRun(r => r + 1)} aria-label="Replay this frame"><RotateCcw size={16} aria-hidden="true" /></button>
      <button type="button" className="button secondary" onClick={() => goTo(index + 1)} disabled={index === frames.length - 1} aria-label="Next frame">Next<ChevronRight size={18} aria-hidden="true" /></button>
      <span className="explainer-meta">{storyboard.title} · about {Math.round(total / 60 * 10) / 10} min{reduced ? ' · reduced motion: frames shown as stills' : ''}</span>
    </div>
    <details className="explainer-transcript" open>
      <summary>Transcript</summary>
      <ol>{frames.map((f, i) => <li key={f.id} className={i === index ? 'current' : ''}><button type="button" onClick={() => { setPlaying(false); goTo(i); }}>{f.narration}</button></li>)}</ol>
    </details>
    {poster && <img className="sr-only" src={poster} alt="" />}
  </div>;
}
