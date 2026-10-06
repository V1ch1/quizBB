import Link from 'next/link';
import { requireSurveyAdmin } from '@/lib/survey-auth';
import { surveyList, surveySummary } from '@/lib/survey-store';
import { DEPARTMENTS, SURVEY_QUESTIONS } from '@/lib/survey';
import { logoutSurvey } from '../actions';
export const dynamic = 'force-dynamic';
const score = (n: number | null) => n === null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  await requireSurveyAdmin();
  const params = await searchParams;
  const requested = Number(params.pagina);
  const summary = await surveySummary();
  const pages = Math.max(1, Math.ceil(summary.total / 20));
  const page = Number.isSafeInteger(requested) ? Math.max(1, Math.min(pages, requested)) : 1;
  const rows = await surveyList(page);
  return <>
    <div className="survey-admin-heading"><div><span className="survey-kicker">PANEL PRIVADO · SOLO CONSULTA</span><h1>Resultados de la encuesta</h1></div><form action={logoutSurvey}><button className="survey-secondary">Cerrar sesión</button></form></div>
    <p>{summary.total} {summary.total === 1 ? 'encuesta recibida' : 'encuestas recibidas'} · <Link href="/encuesta/resultados" prefetch={false}>Actualizar resultados</Link></p>
    <p className="survey-note">Cada encuesta es anónima. No se recoge la identidad de quien responde. Las medias incluyen todas las valoraciones, también los ceros.</p>
    <div className="survey-stat-grid">{DEPARTMENTS.map((name, d) => <section className="survey-card" key={name}><h2>{name}</h2><strong className="survey-big-score">{score(summary.departments[d])}<small> / 10</small></strong><p>Media de las seis preguntas</p></section>)}</div>
    {!summary.total && <p className="survey-card">Todavía no hay encuestas enviadas. Los resultados aparecerán aquí cuando lleguen las primeras respuestas.</p>}
    {DEPARTMENTS.map((name, d) => <section className="survey-card survey-result-section" key={name}><h2>{name} · resultados por pregunta</h2>{SURVEY_QUESTIONS.map((question, q) => { const item = summary.questions[d][q]; return <div className="survey-metric" key={question}><div><h3>{q + 1}. {question}</h3><strong>{score(item.average)} / 10</strong></div><meter min={0} max={10} value={item.average ?? 0} aria-label={`Media: ${question}`} /><details><summary>Ver distribución de las puntuaciones</summary><div className="survey-distribution">{item.distribution.map((count, n) => <div key={n}><strong>{n}</strong><span>{count} {count === 1 ? 'respuesta' : 'respuestas'}</span></div>)}</div></details></div>; })}</section>)}
    <section className="survey-card survey-result-section"><h2>Encuestas individuales</h2><p>Abre una encuesta para ver sus 18 valoraciones y sus comentarios.</p><ul className="survey-response-list">{rows.map((row, i) => <li key={String(row.id)}><Link href={`/encuesta/resultados/${row.id}`} prefetch={false}><strong>Encuesta {summary.total - (page - 1) * 20 - i}</strong><span>Ver respuestas →</span></Link></li>)}</ul><nav className="survey-pagination" aria-label="Páginas de encuestas">{page > 1 && <Link href={`?pagina=${page - 1}`}>← Anterior</Link>}<span>Página {page} de {pages}</span>{page < pages && <Link href={`?pagina=${page + 1}`}>Siguiente →</Link>}</nav></section>
  </>;
}
