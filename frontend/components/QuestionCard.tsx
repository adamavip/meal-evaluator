'use client';

import { Check } from 'lucide-react';
import type { Question } from '../lib/assessment';
import type { Confidence } from '../lib/plan';

/** The answer option list shared by the diagnostic, mastery checks and micro-checks. */
export function AnswerOptions({ question, optionIds, selected, onSelect, name, disabled, reveal }: { question: Question; optionIds: string[]; selected?: string; onSelect: (optionId: string) => void; name: string; disabled?: boolean; reveal?: boolean }) {
  return <fieldset className="answer-options" aria-labelledby={`${name}-heading`}><legend className="sr-only">Choose one answer</legend>{optionIds.map((optionId, i) => {
    const option = question.options.find(o => o.id === optionId)!;
    const isSelected = selected === option.id;
    const isCorrect = reveal && option.id === question.correctOptionId;
    const isWrong = reveal && isSelected && option.id !== question.correctOptionId;
    return <label key={option.id} className={`answer-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'is-right' : ''} ${isWrong ? 'is-wrong' : ''}`}>
      <input type="radio" name={name} value={option.id} checked={isSelected} disabled={disabled} onChange={() => onSelect(option.id)} />
      <span className="option-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span><span className="option-copy">{option.text}</span><span className="option-check" aria-hidden="true">{(isSelected || isCorrect) && <Check size={19} strokeWidth={3} />}</span>
    </label>;
  })}</fieldset>;
}

export function ConfidenceTap({ value, onChange, disabled }: { value?: Confidence; onChange: (c: Confidence) => void; disabled?: boolean }) {
  return <div className="confidence-tap" role="group" aria-label="How sure are you?">
    <span className="confidence-label">How sure are you?</span>
    <div className="segmented">
      <button type="button" aria-pressed={value === 'sure'} disabled={disabled} onClick={() => onChange('sure')}>Sure</button>
      <button type="button" aria-pressed={value === 'unsure'} disabled={disabled} onClick={() => onChange('unsure')}>Not sure</button>
    </div>
  </div>;
}
