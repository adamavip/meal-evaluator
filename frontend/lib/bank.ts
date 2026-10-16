import bankData from '../data/question-bank.json';
import type { Bank, Question } from './assessment.ts';

export const BANK = bankData as Bank;
const byId = new Map(BANK.questions.map(q => [q.id, q]));
export const questionById = (id: string): Question | undefined => byId.get(id);
export const DIAGNOSTIC_COUNT = BANK.questions.filter(q => q.pool === 'diagnostic').length;
