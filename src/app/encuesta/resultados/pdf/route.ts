import { requireSurveyAdmin } from '@/lib/survey-auth';
import { surveySummary } from '@/lib/survey-store';
import { globalSurveyPdf, pdfDownload } from '@/lib/survey-pdf';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  await requireSurveyAdmin();
  return pdfDownload(await globalSurveyPdf(await surveySummary()), 'cosnor-estadisticas-globales.pdf');
}
