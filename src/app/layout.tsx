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
  title: 'El reto Cosnor · Aquí se juega con historia',
  description: '24 preguntas, 4 rondas y una pasión compartida. Juega al reto Cosnor y descubre cuánto sabes de Cosnor y el Dépor.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body className={hanken.variable}>{children}</body></html>;
}
