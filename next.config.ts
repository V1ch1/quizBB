import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['pg'],
  outputFileTracingIncludes: { '/encuesta/resultados/**': ['./src/assets/fonts/*.ttf'] },
  poweredByHeader: false,
  devIndicators: false,
};
export default config;
