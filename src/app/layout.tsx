import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk } from 'next/font/google';
import './globals.css';

const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap' });
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#faf9f6',
};
export const metadata: Metadata = {
  title: 'El reto Cosnor · Convención Anual 2026 · Riazor',
  description: 'Convención Anual de Cosnor · 23 de octubre de 2026 · Estadio de Riazor. 24 preguntas, 4 rondas y 15 segundos por pregunta.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body className={hanken.variable}>{children}</body></html>;
}
