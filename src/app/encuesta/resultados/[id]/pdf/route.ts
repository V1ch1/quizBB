import { requireSurveyAdmin } from '@/lib/survey-auth';
import { surveyDetail } from '@/lib/survey-store';
import { individualSurveyPdf, pdfDownload } from '@/lib/survey-pdf';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSurveyAdmin();
  const { id } = await params;
  const response = /^[a-f0-9-]{36}$/.test(id) ? await surveyDetail(id) : null;
  if (!response) return new Response('Encuesta no encontrada.', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  return pdfDownload(await individualSurveyPdf(response), `cosnor-cuestionario-${id}.pdf`);
}
