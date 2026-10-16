'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, BookOpen, ClipboardCheck, Compass, Database, Layers3, Network, RefreshCw, Route, ScanSearch, Target, Users } from 'lucide-react';
import type { Question } from '../lib/assessment';
import type { Status } from '../lib/plan';
import { STATUS_LABEL } from '../lib/plan';

const ICONS = { compass: Compass, route: Route, layers: Layers3, target: Target, check: ClipboardCheck, database: Database, scan: ScanSearch, refresh: RefreshCw, users: Users, network: Network, award: Award };

export function TopicIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICONS[name as keyof typeof ICONS] || BookOpen;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export function SourceNote({ question }: { question: Question }) {
  return <p className="source-note"><BookOpen size={14} aria-hidden="true" /><span>Framework §{question.source.section} · {question.source.title}{question.source.kind === 'application' ? ' · Applied scenario' : ''}</span></p>;
}

export function SectionRef({ section, title }: { section: string; title: string }) {
  return <p className="source-note"><BookOpen size={14} aria-hidden="true" /><span>Framework §{section} · {title}</span></p>;
}

export function formatDate(date: string) {
  return new Date(date).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function formatDay(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Scrolls to the top and moves focus to the page heading on mount, as the single-page app did on screen changes. */
export function usePageFocus(key?: string) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const handle = window.setTimeout(() => document.querySelector<HTMLElement>('[data-page-heading]')?.focus({ preventScroll: true }), 80);
    return () => window.clearTimeout(handle);
  }, [key]);
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="text-button back-link" href={href}><ArrowLeft size={17} aria-hidden="true" />{children}</Link>;
}

export function StatusStamp({ status, small }: { status: Status | 'known'; small?: boolean }) {
  const label = status === 'known' ? 'Marked as known' : STATUS_LABEL[status];
  return <span className={`status-stamp status-${status} ${small ? 'small' : ''}`}><span className="status-icon" aria-hidden="true" />{label}</span>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="loading-block" />{label}</div>;
}
