import 'server-only';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { scoreGame } from './game';
import type { StoredGame, Ranking, RankingEntry } from './types';
import type { DatabaseSync } from 'node:sqlite';
import type { Pool } from 'pg';

const SCHEMA = `CREATE TABLE IF NOT EXISTS quiz_games (
  id TEXT PRIMARY KEY, public_id TEXT NOT NULL UNIQUE, alias TEXT NOT NULL,
  payload TEXT NOT NULL, revision INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0,
  finished INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
); CREATE INDEX IF NOT EXISTS quiz_ranking ON quiz_games(finished, score DESC);`;
type Resources = { sqlite?: DatabaseSync; pg?: Pool; ready?: Promise<void> };
const globalStore = globalThis as typeof globalThis & { quizStore?: Resources };
const resources = globalStore.quizStore ??= {};

async function initialize() {
  if (!resources.ready) resources.ready = (async () => {
    if (process.env.DATABASE_URL) {
      const { Pool } = await import('pg');
      resources.pg = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10000 });
      await resources.pg.query(SCHEMA);
    } else {
      if (process.env.VERCEL) throw new Error('DATABASE_URL es obligatorio en Vercel.');
      const { DatabaseSync } = await import('node:sqlite');
      // Runtime database is created on the host, never bundled into the deployment.
      const filename = resolve(/* turbopackIgnore: true */ process.env.QUIZ_SQLITE_PATH || '.data/quiz.sqlite');
      mkdirSync(dirname(filename), { recursive: true });
      resources.sqlite = new DatabaseSync(filename);
      resources.sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
      resources.sqlite.exec(SCHEMA);
    }
  })().catch(error => { resources.ready = undefined; throw error; });
  await resources.ready;
}

async function query(sql: string, values: (string | number)[] = []): Promise<Record<string, unknown>[]> {
  await initialize();
  if (resources.pg) return (await resources.pg.query(sql, values)).rows;
  // Queries use parameters once in ascending order, compatible with both engines.
  return resources.sqlite!.prepare(sql.replace(/\$\d+/g, '?')).all(...values) as Record<string, unknown>[];
}

export async function insertGame(game: StoredGame) {
  await query('INSERT INTO quiz_games(id, public_id, alias, payload, revision, created_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
    [game.id, game.publicId, game.alias, JSON.stringify(game), game.revision, game.createdAt]);
}
export async function readGame(id: string): Promise<StoredGame | null> {
  const rows = await query('SELECT payload FROM quiz_games WHERE id = $1', [id]);
  return rows.length ? JSON.parse(String(rows[0].payload)) : null;
}
export async function saveGame(game: StoredGame, previousRevision: number): Promise<boolean> {
  const rows = await query('UPDATE quiz_games SET payload=$1, revision=$2, score=$3, finished=$4 WHERE id=$5 AND revision=$6 RETURNING id',
    [JSON.stringify(game), game.revision, scoreGame(game).score, game.finishedAt ? 1 : 0, game.id, previousRevision]);
  return rows.length === 1;
}
function rankingEntry(row: Record<string, unknown>): RankingEntry {
  return { publicId: String(row.public_id), alias: String(row.alias), score: Number(row.score), rank: Number(row.rank) };
}
export async function readRanking(ownId?: string): Promise<Ranking> {
  const ranked = 'SELECT public_id, alias, score, created_at, RANK() OVER (ORDER BY score DESC) AS rank FROM quiz_games WHERE finished=1';
  const [rows, count, ownRows] = await Promise.all([
    query(`SELECT * FROM (${ranked}) AS ranking ORDER BY score DESC, created_at ASC, public_id ASC LIMIT 50`),
    query('SELECT COUNT(*) AS total FROM quiz_games WHERE finished=1'),
    ownId ? query(`SELECT * FROM (${ranked}) AS ranking WHERE public_id=$1`, [ownId]) : Promise.resolve([]),
  ]);
  return { entries: rows.map(rankingEntry), total: Number(count[0].total), own: ownRows[0] ? rankingEntry(ownRows[0]) : null };
}
