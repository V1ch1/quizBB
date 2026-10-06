import { redirect } from 'next/navigation';
import SurveyLogin from '@/components/survey-login';
import { adminConfigured, isSurveyAdmin } from '@/lib/survey-auth';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (await isSurveyAdmin()) redirect('/encuesta/resultados');
  return <section className="survey-card survey-login-card"><span className="survey-kicker">ACCESO PRIVADO · COSNOR</span><h1>Resultados de la encuesta</h1><p>Accede con las credenciales facilitadas por el equipo de desarrollo.</p>{adminConfigured() ? <SurveyLogin /> : <p role="status">El panel está pendiente de activar. Contacta con el equipo de desarrollo para obtener acceso.</p>}</section>;
}
