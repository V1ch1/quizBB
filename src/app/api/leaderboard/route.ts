import { currentGame } from '@/lib/session';
import { readRanking } from '@/lib/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const current = await currentGame();
    return Response.json(await readRanking(current?.publicId), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'La clasificación no está disponible. Inténtalo de nuevo.' }, { status: 503 });
  }
}
