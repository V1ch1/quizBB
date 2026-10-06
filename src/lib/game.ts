import { randomInt, randomUUID, randomBytes } from 'node:crypto';
import source from '@/data/questions.json';
import { POINTS_PER_ANSWER, QUESTION_SECONDS } from './config';
import type { GameView, Question, StoredGame } from './types';

export function cleanAlias(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Escribe un alias para jugar.');
  const alias = input.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (alias.length < 2 || alias.length > 20 || !/^[\p{L}\p{N} _.-]+$/u.test(alias)) {
    throw new Error('Usa entre 2 y 20 caracteres: letras, números, espacios, puntos o guiones.');
  }
  return alias;
}

export function createGame(input: unknown): StoredGame {
  const questions = structuredClone(source) as Question[];
  for (const question of questions) {
    for (let i = question.options.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [question.options[i], question.options[j]] = [question.options[j], question.options[i]];
    }
    // Opaque option IDs: the original A/B/C/D answer pattern is never exposed.
    const correct = question.correct;
    for (const option of question.options) {
      const original = option.id;
      option.id = randomUUID();
      if (original === correct) question.correct = option.id;
    }
  }
  return { id: randomBytes(32).toString('hex'), publicId: randomUUID(), alias: cleanAlias(input),
    index: 0, stage: 'intro', questions, answers: {}, revision: 0,
    createdAt: new Date().toISOString(), finishedAt: null, questionDeadline: null };
}

export function scoreGame(game: StoredGame) {
  const correctCount = game.questions.filter(q => game.answers[q.id] === q.correct).length;
  return { correctCount, score: correctCount * POINTS_PER_ANSWER };
}

export function gameView(game: StoredGame, now = Date.now()): GameView {
  const current = game.questions[game.index];
  const showQuestion = game.stage === 'question' || game.stage === 'feedback';
  return { publicId: game.publicId, alias: game.alias, index: game.index, stage: game.stage,
    revision: game.revision, total: game.questions.length, round: current.round, ...scoreGame(game),
    questionDeadline: game.questionDeadline ?? null, serverNow: now,
    question: showQuestion ? { id: current.id, round: current.round, text: current.text, options: current.options } : null,
    feedback: game.stage === 'feedback' ? { selected: game.answers[current.id], correct: current.correct,
      isCorrect: game.answers[current.id] === current.correct, timedOut: game.answers[current.id] === null } : null };
}

export function answerGame(game: StoredGame, questionId: unknown, optionId: unknown, now = Date.now()): StoredGame {
  const question = game.questions[game.index];
  if (game.stage !== 'question' || questionId !== question.id || typeof optionId !== 'string' ||
    !question.options.some(o => o.id === optionId) || question.id in game.answers) {
    throw new Error('Esta respuesta no es válida. Recarga para recuperar tu partida.');
  }
  if (!game.questionDeadline) throw new Error('Recarga la página para sincronizar el contador.');
  if (now >= game.questionDeadline) return expireGame(game, now);
  return { ...game, stage: 'feedback', questionDeadline: null, answers: { ...game.answers, [question.id]: optionId }, revision: game.revision + 1 };
}

export function expireGame(game: StoredGame, now = Date.now()): StoredGame {
  if (game.stage !== 'question' || !game.questionDeadline || now < game.questionDeadline) return game;
  return { ...game, stage: 'feedback', questionDeadline: null,
    answers: { ...game.answers, [game.questions[game.index].id]: null }, revision: game.revision + 1 };
}

// Existing unfinished sessions receive a deadline once; reads never extend it.
export function reconcileClock(game: StoredGame, now = Date.now()): StoredGame {
  if (game.stage === 'question' && !game.questionDeadline) {
    return { ...game, questionDeadline: now + QUESTION_SECONDS * 1000, revision: game.revision + 1 };
  }
  return expireGame(game, now);
}

export function advanceGame(game: StoredGame, now = Date.now()): StoredGame {
  if (game.stage === 'intro') return { ...game, stage: 'question', questionDeadline: now + QUESTION_SECONDS * 1000, revision: game.revision + 1 };
  if (game.stage !== 'feedback') throw new Error('Responde a la pregunta para continuar.');
  if (game.index === game.questions.length - 1) return {
    ...game, stage: 'result', questionDeadline: null, finishedAt: new Date(now).toISOString(), revision: game.revision + 1,
  };
  const index = game.index + 1;
  const stage = game.questions[index].round !== game.questions[game.index].round ? 'intro' : 'question';
  return { ...game, index, stage, questionDeadline: stage === 'question' ? now + QUESTION_SECONDS * 1000 : null, revision: game.revision + 1 };
}
