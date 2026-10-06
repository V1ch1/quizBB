'use server';
import { redirect } from 'next/navigation';
import { validateSurvey } from '@/lib/survey';
import { allowLoginAttempt, insertSurvey } from '@/lib/survey-store';
import { adminConfigured, createAdminSession, destroyAdminSession } from '@/lib/survey-auth';
import { verifyPassword } from '@/lib/admin-password';

export async function submitSurvey(token: string, value: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9-]{36}$/.test(token)) return { ok: false, error: 'Recarga la página y vuelve a intentarlo.' };
  let answers;
  try { answers = validateSurvey(value); } catch (error) { return { ok: false, error: (error as Error).message }; }
  try { await insertSurvey(token, answers); return { ok: true, error: '' }; }
  catch { return { ok: false, error: 'No se ha podido enviar. Conservamos tus respuestas en esta página; vuelve a intentarlo.' }; }
}
export async function loginSurvey(_previous: { error: string }, form: FormData) {
  if (!adminConfigured()) return { error: 'El acceso privado aún no está configurado. Contacta con el equipo de desarrollo.' };
  const user = form.get('username'); const password = form.get('password');
  if (typeof user !== 'string' || typeof password !== 'string' || user.length > 100 || password.length > 256) return { error: 'Usuario o contraseña incorrectos.' };
  try {
    if (!await allowLoginAttempt()) return { error: 'Demasiados intentos. Inténtalo de nuevo dentro de 15 minutos.' };
    const passwordOK = await verifyPassword(password, process.env.SURVEY_ADMIN_PASSWORD_HASH!);
    if (!passwordOK || user !== process.env.SURVEY_ADMIN_USER) return { error: 'Usuario o contraseña incorrectos.' };
    await createAdminSession();
  } catch { return { error: 'No se ha podido iniciar sesión. Vuelve a intentarlo.' }; }
  redirect('/encuesta/resultados');
}
export async function logoutSurvey() {
  await destroyAdminSession();
  redirect('/encuesta/acceso');
}
