import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { query } from './store';
import { SURVEY_VERSION, summarizeSurvey, type SurveyAnswers } from './survey';

// Additive schema: quiz data and survey data never share identifiers.
let ready: Promise<void> | undefined;
export async function surveyDatabase() {
  ready ??= (async () => {
    await query(`CREATE TABLE IF NOT EXISTS survey_responses (
      id TEXT PRIMARY KEY, submission_key TEXT NOT NULL UNIQUE, version TEXT NOT NULL,
      ratings TEXT NOT NULL, comments TEXT NOT NULL, created_at TEXT NOT NULL)`);
    await query('CREATE INDEX IF NOT EXISTS survey_version_date ON survey_responses(version, created_at)');
    await query(`CREATE TABLE IF NOT EXISTS survey_admin_sessions (
      token_hash TEXT PRIMARY KEY, credential_version TEXT NOT NULL, expires_at BIGINT NOT NULL)`);
    await query(`CREATE TABLE IF NOT EXISTS survey_login_limits (
      bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at BIGINT NOT NULL)`);
  })().catch(error => { ready = undefined; throw error; });
  await ready;
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function insertSurvey(token: string, answers: SurveyAnswers) {
  await surveyDatabase();
  // Retries, double clicks and concurrent requests can only insert once.
  await query(`INSERT INTO survey_responses(id,submission_key,version,ratings,comments,created_at)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(submission_key) DO NOTHING RETURNING id`,
  [randomUUID(), digest(token), SURVEY_VERSION, JSON.stringify(answers.ratings), JSON.stringify(answers.comments), new Date().toISOString()]);
}
export async function surveySummary() {
  await surveyDatabase();
  const rows = await query('SELECT ratings FROM survey_responses WHERE version=$1', [SURVEY_VERSION]);
  return summarizeSurvey(rows.map(row => ({ ratings: JSON.parse(String(row.ratings)) })));
}
export async function surveyList(page: number) {
  await surveyDatabase();
  return query('SELECT id,created_at FROM survey_responses WHERE version=$1 ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $2', [SURVEY_VERSION, (page - 1) * 20]);
}
export async function surveyDetail(id: string): Promise<(SurveyAnswers & { id: string; createdAt: string }) | null> {
  await surveyDatabase();
  const rows = await query('SELECT id,ratings,comments,created_at FROM survey_responses WHERE id=$1 AND version=$2', [id, SURVEY_VERSION]);
  return rows[0] ? { id: String(rows[0].id), createdAt: String(rows[0].created_at), ratings: JSON.parse(String(rows[0].ratings)), comments: JSON.parse(String(rows[0].comments)) } : null;
}
export async function allowLoginAttempt(now = Date.now()) {
  await surveyDatabase();
  await query('DELETE FROM survey_login_limits WHERE expires_at < $1', [now]);
  const bucket = String(Math.floor(now / 900000));
  const rows = await query(`INSERT INTO survey_login_limits(bucket,attempts,expires_at) VALUES($1,1,$2)
    ON CONFLICT(bucket) DO UPDATE SET attempts=survey_login_limits.attempts+1 RETURNING attempts`, [bucket, now + 900000]);
  return Number(rows[0].attempts) <= 30;
}
