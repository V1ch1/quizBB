// Local-only browser verification. Start Next with QUIZ_SQLITE_PATH=.qa/pdf-browser.sqlite on port 3002.
import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser = await chromium.connectOverCDP(process.argv[2]);
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const base = 'http://localhost:3002';
const id = randomUUID();
let db;
try {
  for (const path of ['/encuesta/resultados/pdf', `/encuesta/resultados/${id}/pdf`]) {
    const response = await context.request.get(base + path, { maxRedirects: 0 });
    assert.equal(response.status(), 307);
    assert.ok(response.headers().location.endsWith('/encuesta/acceso'));
  }
  await page.goto(base + '/encuesta/acceso');
  const credentials = readFileSync('.data/survey-admin-access.txt', 'utf8');
  await page.getByLabel('Usuario', { exact: true }).fill(credentials.match(/Usuario: (.*)/)[1]);
  await page.getByLabel('Contraseña', { exact: true }).fill(credentials.match(/Contraseña: (.*)/)[1]);
  await page.getByRole('button', { name: 'Entrar al panel' }).click();
  await page.waitForURL('**/encuesta/resultados');
  assert.equal((await context.request.get(base + `/encuesta/resultados/${id}/pdf`)).status(), 404);
  db = new DatabaseSync('.qa/pdf-browser.sqlite');
  db.prepare('INSERT INTO survey_responses(id,submission_key,version,ratings,comments,created_at) VALUES(?,?,?,?,?,?)').run(id, id, 'cosnor-iv-2026-v1', JSON.stringify(Array.from({ length: 3 }, () => [0,2,4,6,8,10])), JSON.stringify(['PDF de prueba', '', '']), new Date().toISOString());
  await page.reload();
  for (const [url, name, pages] of [
    ['/encuesta/resultados', 'Exportar estadísticas a PDF', 4],
    [`/encuesta/resultados/${id}`, 'Exportar cuestionario a PDF', 3],
  ]) {
    await page.goto(base + url);
    const link = page.getByRole('link', { name });
    await link.waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const response = await context.request.get(base + await link.getAttribute('href'));
    assert.equal(response.status(), 200);
    assert.equal(response.headers()['content-type'], 'application/pdf');
    assert.ok(response.headers()['cache-control'].includes('no-store'));
    const pdf = await PDFDocument.load(await response.body());
    assert.equal(pdf.getPageCount(), pages);
    const download = page.waitForEvent('download'); await link.click();
    assert.ok((await download).suggestedFilename().endsWith('.pdf'));
  }
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForURL('**/encuesta/acceso');
  assert.equal((await context.request.get(base + '/encuesta/resultados/pdf', { maxRedirects: 0 })).status(), 307);
  console.log('PASS: authenticated downloads, individual/global PDFs, real download buttons, mobile layout, 404, anonymous denial and logout.');
} finally {
  if (db) { db.prepare('DELETE FROM survey_responses WHERE id=?').run(id); db.close(); }
  await context.close(); await browser.close();
}
