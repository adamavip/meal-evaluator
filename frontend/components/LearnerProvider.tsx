'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BANK } from '../lib/bank';
import { LESSONS } from '../lib/content';
import { emptyLearner, LEGACY_STORAGE_KEY, restoreLearner, STORAGE_KEY } from '../lib/learner';
import type { LearnerState } from '../lib/learner';

export type ConfirmOptions = { title: string; body: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => void };
type LearnerContext = {
  state: LearnerState;
  hydrated: boolean;
  storageWarning: boolean;
  update: (fn: (state: LearnerState) => LearnerState) => void;
  replace: (state: LearnerState) => void;
  reset: () => void;
  confirm: (options: ConfirmOptions) => void;
};

const LESSON_IDS = new Set(LESSONS.map(l => l.id));
const Context = createContext<LearnerContext | null>(null);

export function LearnerProvider({ children, renderDialog }: { children: React.ReactNode; renderDialog: (options: ConfirmOptions | null, close: () => void) => React.ReactNode }) {
  const [state, setState] = useState<LearnerState>(() => emptyLearner(BANK));
  const [hydrated, setHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const migrated = useRef(false);

  useEffect(() => {
    try {
      const rawV2 = localStorage.getItem(STORAGE_KEY);
      const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
      const restored = restoreLearner(rawV2, rawV1, BANK, LESSON_IDS);
      if (restored) setState(restored);
      if (!rawV2 && rawV1) migrated.current = true;
    } catch { setStorageWarning(true); }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (migrated.current) { localStorage.removeItem(LEGACY_STORAGE_KEY); migrated.current = false; }
    } catch { setStorageWarning(true); }
  }, [state, hydrated]);

  const update = useCallback((fn: (s: LearnerState) => LearnerState) => setState(prev => fn(prev)), []);
  const replace = useCallback((next: LearnerState) => setState(next), []);
  const reset = useCallback(() => setState(emptyLearner(BANK)), []);
  const confirm = useCallback((options: ConfirmOptions) => setDialog(options), []);
  const value = useMemo(() => ({ state, hydrated, storageWarning, update, replace, reset, confirm }), [state, hydrated, storageWarning, update, replace, reset, confirm]);
  return <Context.Provider value={value}>{children}{renderDialog(dialog, () => setDialog(null))}</Context.Provider>;
}

export function useLearner(): LearnerContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useLearner must be used inside LearnerProvider');
  return ctx;
}
