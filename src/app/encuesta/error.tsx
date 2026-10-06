'use client';
export default function Error({ reset }: { reset: () => void }) {
  return <section className="survey-card"><h1>No hemos podido cargar esta página.</h1><p>Comprueba la conexión y vuelve a intentarlo.</p><button className="survey-primary" onClick={reset}>Reintentar</button></section>;
}
