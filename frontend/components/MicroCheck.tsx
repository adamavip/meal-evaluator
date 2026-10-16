'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, CircleX } from 'lucide-react';
import { questionById } from '../lib/bank';
import { AnswerOptions } from './QuestionCard';
import { SourceNote } from './ui';

/** A practice question with instant feedback. Not scored for mastery. */
export function MicroCheck({ questionIds }: { questionIds: string[] }) {
  const questions = questionIds.map(questionById).filter(q => q !== undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  if (!questions.length) return null;
  return <div className="micro-check">
    {questions.map((q, i) => {
      const selected = answers[q.id];
      const correct = selected === q.correctOptionId;
      return <div className="micro-item" key={q.id}>
        <h4 id={`micro-${q.id}-heading`} className="micro-question"><span className="micro">Check {i + 1}</span>{q.question}</h4>
        <AnswerOptions question={q} optionIds={q.options.map(o => o.id)} selected={selected} name={`micro-${q.id}`} disabled={Boolean(selected)} reveal={Boolean(selected)} onSelect={id => setAnswers({ ...answers, [q.id]: id })} />
        <AnimatePresence>{selected && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }} className={`micro-feedback ${correct ? 'good' : 'bad'}`} role="status">
          <p className="micro-verdict">{correct ? <CircleCheck size={18} aria-hidden="true" /> : <CircleX size={18} aria-hidden="true" />}{correct ? 'Right.' : 'Not quite.'}</p>
          <p>{q.explanation}</p>
          {!correct && <p className="review-tip"><strong>Try this:</strong> {q.reviewTip}</p>}
          <SourceNote question={q} />
        </motion.div>}</AnimatePresence>
      </div>;
    })}
  </div>;
}
