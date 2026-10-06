import 'server-only';
import { cookies } from 'next/headers';
import { readGame, saveGame } from './store';
import { reconcileClock } from './game';
export const COOKIE = 'cosnor_quiz_session';
export async function currentGame() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const game = await readGame(id);
    if (!game) return null;
    const current = reconcileClock(game);
    if (current === game || await saveGame(current, game.revision)) return current;
  }
  throw new Error('Concurrent session updates; retry.');
}
