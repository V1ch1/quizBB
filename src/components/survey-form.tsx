'use client';
import { useEffect, useRef, useState } from 'react';
import { DEPARTMENTS, SURVEY_QUESTIONS, SURVEY_VERSION } from '@/lib/survey';
import { submitSurvey } from '@/app/encuesta/actions';

type Draft = { token: string; ratings: (number | null)[][]; comments: string[]; step: number; sent: boolean };
const KEY = `${SURVEY_VERSION}-draft`;
function fresh(): Draft { return { token: crypto.randomUUID(), ratings: DEPARTMENTS.map(() => SURVEY_QUESTIONS.map(() => null)), comments: ['', '', ''], step: 0, sent: false }; }
function restore(): Draft {
  const initial = fresh();
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && /^[a-f0-9-]{36}$/.test(saved.token) && Array.isArray(saved.ratings) && saved.ratings.length === 3 && saved.ratings.every((row: unknown) => Array.isArray(row) && row.length === 6 && row.every(n => n === null || (Number.isInteger(n) && n >= 0 && n <= 10))) && Array.isArray(saved.comments) && saved.comments.length === 3 && saved.comments.every((s: unknown) => typeof s === 'string' && s.length <= 2000) && Number.isInteger(saved.step) && saved.step >= 0 && saved.step < 3 && typeof saved.sent === 'boolean') return saved;
  } catch { /* Storage may be unavailable in private browsers. */ }
  return initial;
}
export default function SurveyForm() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const gate = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { setDraft(restore()); }, []);
  useEffect(() => { if (draft) { try { sessionStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* Still allow submission. */ } } }, [draft]);
  useEffect(() => { if (draft) heading.current?.focus(); }, [draft?.step, draft?.sent]); // Focus the next section, not each answer.
  if (!draft) return <p role="status">Preparando la encuesta…</p>;
  if (draft.sent) return <section className="survey-card survey-thanks"><span className="survey-kicker">ENCUESTA ENVIADA</span><h1 ref={heading} tabIndex={-1}>Gracias por ayudarnos a mejorar.</h1><p>Hemos guardado tus respuestas. Tu opinión cuenta para seguir creciendo juntos.</p><p className="survey-note">La encuesta se ha enviado sin nombre, correo ni alias.</p></section>;
  const step = draft.step;
  const answered = draft.ratings.flat().filter(n => n !== null).length;
  function move(next: number) { setError(''); setDraft(current => current && { ...current, step: next }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  async function proceed(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || gate.current) return;
    if (draft.ratings[step].some(n => n === null)) { setError('Selecciona una puntuación para cada pregunta.'); return; }
    if (step < 2) { move(step + 1); return; }
    if (draft.ratings.some(row => row.some(n => n === null))) { setError('Faltan valoraciones. Revisa los departamentos anteriores.'); return; }
    gate.current = true; setBusy(true); setError('');
    try {
      const result = await submitSurvey(draft.token, { ratings: draft.ratings, comments: draft.comments });
      if (result.ok) setDraft(current => current && { ...current, sent: true, ratings: current.ratings.map(row => row.map(() => null)), comments: ['', '', ''] });
      else setError(result.error);
    } catch { setError('Comprueba tu conexión y vuelve a intentarlo. Tus respuestas siguen aquí.'); }
    finally { gate.current = false; setBusy(false); }
  }
  return <>
    <div className="survey-intro"><span className="survey-kicker">TU OPINIÓN NOS AYUDA A MEJORAR</span><h1>Encuesta de satisfacción</h1><p>Valora tu experiencia con nuestros tres departamentos. Es anónima y puedes responder a tu ritmo.</p><p className="survey-note">No pedimos nombre, correo ni alias. Evita incluir datos personales en los comentarios.</p></div>
    <div className="survey-progress"><span>Paso {step + 1} de 3</span><span>{answered} de 18 valoraciones</span></div><progress value={answered} max={18} aria-label="Valoraciones completadas" />
    <nav className="survey-steps" aria-label="Departamentos">{DEPARTMENTS.map((name, d) => <button type="button" key={name} aria-current={step === d ? 'step' : undefined} disabled={busy || d > step} onClick={() => move(d)}>{d + 1}. {name}</button>)}</nav>
    <form onSubmit={proceed} className="survey-card">
      <span className="survey-kicker">DEPARTAMENTO {step + 1} / 3</span><h2 ref={heading} tabIndex={-1}>{DEPARTMENTS[step]}</h2><p className="survey-note">Selecciona una puntuación de 0 a 10 en cada pregunta. Todas las valoraciones son obligatorias.</p>
      <fieldset disabled={busy} className="survey-fields">
        {SURVEY_QUESTIONS.map((question, q) => <fieldset key={`${step}-${q}`} className="survey-question"><legend>{q + 1}. {question}</legend><div className="survey-scale">{Array.from({ length: 11 }, (_, n) => <label key={n}><input type="radio" name={`rating-${step}-${q}`} value={n} required checked={draft.ratings[step][q] === n} onChange={() => setDraft(current => current && { ...current, ratings: current.ratings.map((row, d) => d === step ? row.map((old, i) => i === q ? n : old) : row) })} /><span>{n}</span></label>)}</div><div className="survey-scale-label"><span>0 · Valoración mínima</span><span>10 · Valoración máxima</span></div></fieldset>)}
        <div className="survey-comment"><label htmlFor="suggestion">7. Si pudieras, ¿qué mejorarías? <span>(opcional)</span></label><textarea id="suggestion" rows={5} maxLength={2000} value={draft.comments[step]} onChange={event => { const text = event.target.value; setDraft(current => current && { ...current, comments: current.comments.map((old, d) => d === step ? text : old) }); }} /><span className="survey-note">{draft.comments[step].length} / 2.000 caracteres</span></div>
      </fieldset>
      {error && <p className="survey-error" role="alert">{error}</p>}
      <div className="survey-actions">{step > 0 && <button type="button" className="survey-secondary" disabled={busy} onClick={() => move(step - 1)}>Anterior</button>}<button className="survey-primary" disabled={busy}>{busy ? 'Enviando…' : step === 2 ? 'Enviar encuesta' : 'Siguiente departamento →'}</button></div>
      {step === 2 && <p className="survey-note">Puedes volver atrás para revisar tus respuestas antes de enviarlas.</p>}
    </form>
  </>;
}
