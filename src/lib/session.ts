import 'server-only';
import { cookies } from 'next/headers';
import { readGame } from './store';
export const COOKIE = 'cosnor_quiz_session';
export async function currentGame() {
  const id = (await cookies()).get(COOKIE)?.value;
  return id && /^[a-f0-9]{64}$/.test(id) ? readGame(id) : null;
}
