import Link from 'next/link';
export default function NotFound() {
  return <main className="error-page"><p className="eyebrow">404 · FUERA DE JUEGO</p><h1>El partido está en otra página.</h1><Link className="button primary" href="/">Ir al reto Cosnor</Link></main>;
}
