import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { advanceGame, answerGame, createGame } from '../src/lib/game';
import type { StoredGame } from '../src/lib/types';

test('durable store: compare-and-swap rejects duplicate updates; ties share rank; own result can be outside top 50', async () => {
  mkdirSync('.qa', { recursive: true });
  const directory = mkdtempSync(join('.qa', 'store-test-'));
  process.env.QUIZ_SQLITE_PATH = join(directory, 'quiz.sqlite');
  delete process.env.DATABASE_URL;
  const { insertGame, readGame, saveGame, readRanking } = await import('../src/lib/store');
  const game = createGame('Concurrente');
  await insertGame(game);
  const next = advanceGame(game);
  const writes = await Promise.all([saveGame(next, 0), saveGame(next, 0)]);
  assert.equal(writes.filter(Boolean).length, 1);
  assert.equal((await readGame(game.id))?.revision, 1);
  assert.equal((await readRanking()).total, 0);

  async function finish(alias: string, correctCount: number): Promise<StoredGame> {
    let game = createGame(alias);
    await insertGame(game);
    for (let i = 0; i < 24; i++) {
      if (game.stage === 'intro') game = advanceGame(game);
      const q = game.questions[i];
      game = answerGame(game, q.id, i < correctCount ? q.correct : q.options.find(o => o.id !== q.correct)!.id);
      game = advanceGame(game);
    }
    assert.equal(await saveGame(game, 0), true);
    return game;
  }
  const low = await finish('Mi puesto', 0);
  for (let i = 0; i < 51; i++) await finish(`Equipo ${i}`, 24);
  const ranking = await readRanking(low.publicId);
  assert.equal(ranking.total, 52);
  assert.equal(ranking.entries.length, 50);
  assert.ok(ranking.entries.every(entry => entry.rank === 1 && entry.score === 2400));
  assert.equal(ranking.own?.rank, 52);
  assert.equal(ranking.own?.score, 0);
  assert.ok(!ranking.entries.some(entry => entry.publicId === low.publicId));
  // Test database remains in ignored .qa/, never touches real .data/ records.
});
