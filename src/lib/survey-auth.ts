import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { randomBytes } from 'node:crypto';
import { digest, surveyDatabase } from './survey-store';
import { query } from './store';

export function adminConfigured() {
  return !!process.env.SURVEY_ADMIN_USER && /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.SURVEY_ADMIN_PASSWORD_HASH || '') && (process.env.SURVEY_SESSION_SECRET?.length ?? 0) >= 32;
}
async function session() {
  if (!adminConfigured()) throw new Error('Acceso privado pendiente de configuración.');
  return getIronSession<{ token?: string }>(await cookies(), {
    cookieName: 'cosnor_survey_admin', password: process.env.SURVEY_SESSION_SECRET!, ttl: 8 * 3600,
    cookieOptions: { httpOnly: true, secure: !!process.env.VERCEL || process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') === true, sameSite: 'lax', path: '/encuesta' },
  });
}
const credentialVersion = () => digest(`${process.env.SURVEY_ADMIN_USER}:${process.env.SURVEY_ADMIN_PASSWORD_HASH}`);
export async function isSurveyAdmin() {
  if (!adminConfigured()) return false;
  const current = await session();
  if (!current.token) return false;
  await surveyDatabase();
  const rows = await query('SELECT credential_version,expires_at FROM survey_admin_sessions WHERE token_hash=$1', [digest(current.token)]);
  return !!rows[0] && rows[0].credential_version === credentialVersion() && Number(rows[0].expires_at) > Date.now();
}
export async function requireSurveyAdmin() {
  if (!await isSurveyAdmin()) redirect('/encuesta/acceso');
}
export async function createAdminSession() {
  await surveyDatabase();
  const current = await session();
  if (current.token) await query('DELETE FROM survey_admin_sessions WHERE token_hash=$1', [digest(current.token)]);
  await query('DELETE FROM survey_admin_sessions WHERE expires_at < $1', [Date.now()]);
  current.token = randomBytes(32).toString('hex');
  await query('INSERT INTO survey_admin_sessions(token_hash,credential_version,expires_at) VALUES($1,$2,$3)', [digest(current.token), credentialVersion(), Date.now() + 8 * 3600000]);
  await current.save();
}
export async function destroyAdminSession() {
  if (!adminConfigured()) return;
  const current = await session();
  if (current.token) await query('DELETE FROM survey_admin_sessions WHERE token_hash=$1', [digest(current.token)]);
  current.destroy();
}
