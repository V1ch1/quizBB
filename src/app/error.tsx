'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-page"><p className="eyebrow">EL RETO COSNOR</p><h1>Un pequeño fuera de juego.</h1><p>No hemos podido cargar esta pantalla. Inténtalo de nuevo.</p><button className="button primary" onClick={reset}>Volver a intentar</button></main>;
}
