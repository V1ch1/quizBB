import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSurveyAdmin } from '@/lib/survey-auth';
import { surveyDetail } from '@/lib/survey-store';
import { DEPARTMENTS, SURVEY_QUESTIONS } from '@/lib/survey';
import { logoutSurvey } from '../../actions';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSurveyAdmin();
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const response = await surveyDetail(id);
  if (!response) notFound();
  return <><Link href="/encuesta/resultados">← Volver a los resultados globales</Link><div className="survey-admin-heading"><div><span className="survey-kicker">RESPUESTA ANÓNIMA</span><h1>Detalle de la encuesta</h1><a className="survey-secondary survey-pdf-link" href={`/encuesta/resultados/${id}/pdf`}>Exportar cuestionario a PDF</a></div><form action={logoutSurvey}><button className="survey-secondary">Cerrar sesión</button></form></div>{DEPARTMENTS.map((name, d) => <section className="survey-card survey-result-section" key={name}><h2>{name}</h2><dl className="survey-detail">{SURVEY_QUESTIONS.map((question, q) => <div key={question}><dt>{q + 1}. {question}</dt><dd>{response.ratings[d][q]} / 10</dd></div>)}</dl><h3>7. Si pudieras, ¿qué mejorarías?</h3><p className="survey-comment-text">{response.comments[d] || 'Sin comentario.'}</p></section>)}</>;
}
