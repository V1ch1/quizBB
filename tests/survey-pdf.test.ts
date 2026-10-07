import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { individualSurveyPdf, globalSurveyPdf, pdfDownload } from '../src/lib/survey-pdf';
import { summarizeSurvey } from '../src/lib/survey';
import { mkdirSync, writeFileSync } from 'node:fs';
test('PDF reports preserve multi-page comments, support empty statistics and return private attachments', async () => {
  mkdirSync('.qa/pdf', { recursive: true });
  const answers = { id: '00000000-0000-0000-0000-000000000001', ratings: Array.from({ length: 3 }, () => [0,2,4,6,8,10]), comments: [('Excelente atención. Mejoraría la comunicación y los plazos.\n').repeat(32), 'palabralarga'.repeat(150), 'Sin incidencias: áéíóú ñ € 👍 漢字 <script>texto</script>'] };
  const now = new Date('2026-10-07T10:00:00Z');
  const detail = await individualSurveyPdf(answers, now);
  const global = await globalSurveyPdf(summarizeSurvey(Array(4000).fill(answers)), now);
  const empty = await globalSurveyPdf(summarizeSurvey([]), now);
  assert.ok((await PDFDocument.load(detail)).getPageCount() > 3);
  assert.equal((await PDFDocument.load(global)).getPageCount(), 4);
  assert.equal((await PDFDocument.load(empty)).getPageCount(), 4);
  for (const [name, bytes] of [['individual',detail],['global',global],['empty',empty]] as const) {
    assert.equal(Buffer.from(bytes).subarray(0,5).toString(), '%PDF-');
    writeFileSync(`.qa/pdf/${name}.pdf`, bytes);
  }
  const response = pdfDownload(global, 'cosnor.pdf');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="cosnor.pdf"');
});
