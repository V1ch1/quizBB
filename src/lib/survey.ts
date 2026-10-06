export const SURVEY_VERSION = 'cosnor-iv-2026-v1';
export const DEPARTMENTS = ['Siniestros', 'Contratación', 'Administración'] as const;
export const SURVEY_QUESTIONS = [
  'Nivel de respuesta a los correos',
  'Valora los tiempos de contestación a las incidencias',
  'Capacidad de resolución a los problemas',
  'Respuesta personalizada, contestación de COSNOR',
  'Califica tu satisfacción respecto a nuestro equipo para resolver tu problema.',
  '¿Sentiste que nuestro equipo respondió con prontitud tu consulta?',
] as const;
export type SurveyAnswers = { ratings: number[][]; comments: string[] };
export function validateSurvey(value: unknown): SurveyAnswers {
  if (!value || typeof value !== 'object') throw new Error('Revisa las respuestas.');
  const { ratings, comments } = value as SurveyAnswers;
  if (!Array.isArray(ratings) || ratings.length !== 3 || ratings.some(row =>
    !Array.isArray(row) || row.length !== 6 || row.some(n => typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 10))) {
    throw new Error('Responde las seis valoraciones de cada departamento, de 0 a 10.');
  }
  if (!Array.isArray(comments) || comments.length !== 3 || comments.some(s => typeof s !== 'string' || s.length > 2000)) {
    throw new Error('Cada comentario puede tener hasta 2.000 caracteres.');
  }
  return { ratings: ratings.map(row => [...row]), comments: comments.map(s => s.trim()) };
}
export function summarizeSurvey(responses: Pick<SurveyAnswers, 'ratings'>[]) {
  const questions = DEPARTMENTS.map((_, d) => SURVEY_QUESTIONS.map((_, q) => {
    const distribution = Array<number>(11).fill(0);
    let sum = 0;
    for (const response of responses) { const n = response.ratings[d][q]; sum += n; distribution[n]++; }
    return { average: responses.length ? sum / responses.length : null, distribution };
  }));
  return { total: responses.length, questions, departments: questions.map(row => responses.length
    ? row.reduce((sum, q) => sum + q.average!, 0) / row.length : null) };
}
