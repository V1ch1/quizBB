export type Option = { id: string; text: string };
export type Question = { id: number; round: number; text: string; options: Option[]; correct: string };
export type Stage = 'intro' | 'question' | 'feedback' | 'result';
export type StoredGame = {
  id: string; publicId: string; alias: string; index: number; stage: Stage;
  questions: Question[]; answers: Record<string, string | null>; revision: number;
  createdAt: string; finishedAt: string | null;
  questionDeadline?: number | null;
};
export type GameView = {
  publicId: string; alias: string; index: number; stage: Stage; revision: number;
  total: number; round: number; score: number; correctCount: number;
  questionDeadline: number | null; serverNow: number;
  question: Omit<Question, 'correct'> | null;
  feedback: { selected: string | null; correct: string; isCorrect: boolean; timedOut: boolean } | null;
};
export type RankingEntry = { publicId: string; alias: string; score: number; rank: number };
export type Ranking = { entries: RankingEntry[]; total: number; own: RankingEntry | null };
export type ActionResult = { ok: true; game: GameView } | { ok: false; error: string };
