'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { Storyboard } from '../lib/content';
import { SceneView } from './Scene';

const VOICE_KEY = 'meal.narration';

/**
 * Storyboard player. Frames are learner-paced (segmenting), the caption shows the
 * narration (signalling), and the transcript is always visible below. With reduced
 * motion, frames render as stills and autoplay is off.
 *
 * Narration: `clips` maps a frame id to its audio URL. When the frame has a clip and
 * voice is on, stepping to a frame speaks it, and Play advances when the clip ends
 * instead of on the frame's timer. The timer remains the fallback for frames without
 * a clip, when voice is off, or when a clip fails to load. Voice preference persists
 * in localStorage; nothing plays before the learner's first interaction.
 */
export function Explainer({ storyboard, poster, clips = {} }: { storyboard: Storyboard; poster?: string; clips?: Record<string, string> }) {
  const reduced = Boolean(useReducedMotion());
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0); // bumps to replay a frame's animation
  const [cue, setCue] = useState(0); // bumps to (re)start the current frame's clip
  const [muted, setMuted] = useState(false);
  const [audioOk, setAudioOk] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const frames = storyboard.frames;
  const frame = frames[index];
  const total = frames.reduce((n, f) => n + f.seconds, 0);
  const hasVoice = Object.keys(clips).length > 0;
  const src = clips[frame.id];
  const srcRef = useRef(src); srcRef.current = src;
  const voiced = Boolean(src) && !muted && audioOk;

  useEffect(() => { try { setMuted(window.localStorage.getItem(VOICE_KEY) === 'off'); } catch { /* storage unavailable */ } }, []);

  const goTo = useCallback((next: number) => { setIndex(Math.max(0, Math.min(frames.length - 1, next))); setRun(r => r + 1); setCue(c => c + 1); }, [frames.length]);

  // Start the current frame's clip from the beginning whenever it is cued.
  useEffect(() => {
    const el = audio.current;
    if (cue === 0 || !el) return;
    const url = srcRef.current;
    if (!url || muted) { el.pause(); return; }
    setAudioOk(true);
    if (!el.src.endsWith(url)) el.src = url;
    el.currentTime = 0;
    el.play().catch(() => setAudioOk(false));
  }, [cue, muted]);

  // Timer-driven advance only when this frame is not carried by its clip.
  useEffect(() => {
    if (!playing || voiced) return;
    const handle = window.setTimeout(() => {
      if (index >= frames.length - 1) setPlaying(false); else goTo(index + 1);
    }, frame.seconds * 1000);
    return () => window.clearTimeout(handle);
  }, [playing, voiced, index, frame.seconds, frames.length, goTo]);

  useEffect(() => () => audio.current?.pause(), []);

  function togglePlay() {
    const el = audio.current;
    if (playing) { setPlaying(false); el?.pause(); return; }
    if (index >= frames.length - 1) { setPlaying(true); goTo(0); return; }
    setPlaying(true);
    if (voiced && el && el.src.endsWith(src) && el.currentTime > 0 && !el.ended) el.play().catch(() => setAudioOk(false));
    else setCue(c => c + 1);
  }
  function toggleVoice() {
    const next = !muted;
    setMuted(next);
    try { window.localStorage.setItem(VOICE_KEY, next ? 'off' : 'on'); } catch { /* storage unavailable */ }
    if (next) audio.current?.pause(); else setCue(c => c + 1);
  }
  function onEnded() {
    if (!playing) return;
    if (index >= frames.length - 1) setPlaying(false); else goTo(index + 1);
  }
  function onKey(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1); }
    if (event.key === ' ' && event.target === viewport.current) { event.preventDefault(); togglePlay(); }
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
      {!reduced && <button type="button" className="button primary" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}{playing ? 'Pause' : index >= frames.length - 1 ? 'Replay' : 'Play'}</button>}
      <button type="button" className="button secondary" onClick={() => { setRun(r => r + 1); setCue(c => c + 1); }} aria-label="Replay this frame"><RotateCcw size={16} aria-hidden="true" /></button>
      <button type="button" className="button secondary" onClick={() => goTo(index + 1)} disabled={index === frames.length - 1} aria-label="Next frame">Next<ChevronRight size={18} aria-hidden="true" /></button>
      {hasVoice && <button type="button" className={`button secondary explainer-voice ${muted ? 'off' : ''}`} onClick={toggleVoice} aria-pressed={!muted} aria-label={muted ? 'Turn narration on' : 'Turn narration off'}>{muted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}{muted ? 'Voice off' : 'Voice on'}</button>}
      <span className="explainer-meta">{storyboard.title} · about {Math.round(total / 60 * 10) / 10} min{reduced ? ' · reduced motion: frames shown as stills' : ''}{hasVoice && !audioOk ? ' · narration unavailable' : ''}</span>
    </div>
    {hasVoice && <audio ref={audio} preload="none" onEnded={onEnded} onError={() => setAudioOk(false)} />}
    <details className="explainer-transcript" open>
      <summary>Transcript</summary>
      <ol>{frames.map((f, i) => <li key={f.id} className={i === index ? 'current' : ''}><button type="button" onClick={() => { setPlaying(false); goTo(i); }}>{f.narration}</button></li>)}</ol>
    </details>
    {poster && <img className="sr-only" src={poster} alt="" />}
  </div>;
}
