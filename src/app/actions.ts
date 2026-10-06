'use server';
import { cookies } from 'next/headers';
import { advanceGame, answerGame, createGame, expireGame, gameView } from '@/lib/game';
import { currentGame, COOKIE } from '@/lib/session';
import { insertGame, readGame, saveGame } from '@/lib/store';
import type { ActionResult, StoredGame } from '@/lib/types';

export async function startGame(alias: string): Promise<ActionResult> {
  try {
    const existing = await currentGame();
    if (existing) return { ok: true, game: gameView(existing) };
    const game = createGame(alias);
    await insertGame(game);
    (await cookies()).set(COOKIE, game.id, { httpOnly: true, sameSite: 'lax', path: '/',
      secure: !!process.env.VERCEL || process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') === true,
      maxAge: 60 * 60 * 24 * 30 });
    return { ok: true, game: gameView(game) };
  } catch (error) {
    if (error instanceof Error && /alias|caracteres/.test(error.message)) return { ok: false, error: error.message };
    console.error('Could not start quiz', error);
    return { ok: false, error: 'No hemos podido iniciar la partida. Comprueba la conexión y vuelve a intentarlo.' };
  }
}

async function change(revision: number, transform: (game: StoredGame) => StoredGame): Promise<ActionResult> {
  try {
    const current = await currentGame();
    if (!current) return { ok: false, error: 'No encontramos tu partida. Recarga la página para empezar.' };
    // A retried request or a second tab receives authoritative progress, never another score.
    if (current.revision !== revision) return { ok: true, game: gameView(current) };
    let next: StoredGame;
    try { next = transform(current); } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Respuesta no válida.' };
    }
    if (next === current) return { ok: true, game: gameView(current) };
    if (!await saveGame(next, current.revision)) {
      const latest = await readGame(current.id);
      if (!latest) throw new Error('Session disappeared');
      return { ok: true, game: gameView(latest) };
    }
    return { ok: true, game: gameView(next) };
  } catch (error) {
    console.error('Could not save quiz', error);
    return { ok: false, error: 'No se ha podido guardar. Tu progreso está a salvo; vuelve a intentarlo.' };
  }
}
export async function submitAnswer(revision: number, questionId: number, optionId: string) {
  return change(revision, game => answerGame(game, questionId, optionId));
}
export async function nextStep(revision: number) { return change(revision, advanceGame); }
export async function expireQuestion(revision: number) { return change(revision, expireGame); }
