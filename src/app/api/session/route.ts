import { currentGame } from '@/lib/session';
import { gameView } from '@/lib/game';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const game = await currentGame();
    return Response.json({ game: game ? gameView(game) : null }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'No se ha podido recuperar la partida.' }, { status: 503 });
  }
}
