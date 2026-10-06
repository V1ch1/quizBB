import Image from 'next/image';
import type { Metadata } from 'next';
import { EVENT } from '@/lib/config';
import './survey.css';
export const metadata: Metadata = {
  title: 'Encuesta de satisfacción · IV Convención de Cosnor',
  description: 'Tu opinión nos ayuda a mejorar. Encuesta de satisfacción de Cosnor.',
  robots: { index: false, follow: false },
};
export const runtime = 'nodejs';
export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return <div className="survey-shell">
    <header className="survey-header"><Image src="/cosnor-logo.webp" alt="Cosnor" width={65} height={48} /><strong>Cosnor<span>Personas a tu servicio</span></strong><span className="survey-edition">IV CONVENCIÓN</span></header>
    <div className="survey-event"><strong>{EVENT.title}</strong><span>{EVENT.date} · {EVENT.venue}</span></div>
    <main className="survey-main">{children}</main>
    <footer className="survey-footer">Desarrollado por el equipo de desarrollo de <a href="https://www.blancoyenbatea.com/" target="_blank" rel="noopener noreferrer">www.blancoyenbatea.com<span className="sr-only"> (se abre en una pestaña nueva)</span></a></footer>
  </div>;
}
