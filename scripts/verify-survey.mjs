import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const browser = await chromium.connectOverCDP(process.argv[2]);
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const base = 'http://localhost:3001';
const page = await context.newPage();
const credentialFile = readFileSync('.data/survey-admin-access.txt', 'utf8');
const username = credentialFile.match(/Usuario: (.*)/)[1];
const password = credentialFile.match(/Contraseña: (.*)/)[1];
try {
  await page.goto(`${base}/encuesta/resultados`);
  await page.waitForURL('**/encuesta/acceso');
  assert.equal(await page.getByText('Encuestas individuales', { exact: true }).count(), 0);
  await page.goto(`${base}/encuesta/resultados/00000000-0000-0000-0000-000000000000`);
  await page.waitForURL('**/encuesta/acceso');
  await page.goto(`${base}/encuesta`);
  await page.getByRole('heading', { name: 'Siniestros', exact: true }).waitFor();
  for (const width of [320, 390, 641, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
    const sizes = await page.locator('.survey-scale span').evaluateAll(nodes => nodes.map(n => ({ width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })));
    assert.ok(sizes.every(s => s.height >= 44 && s.width >= 44), `small touch target at ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.qa/survey-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Siguiente departamento' }).click();
  await page.getByRole('heading', { name: 'Siniestros', exact: true }).waitFor();
  for (let d = 0; d < 3; d++) {
    for (let q = 0; q < 6; q++) await page.locator(`input[name="rating-${d}-${q}"][value="${q * 2}"]`).locator('..').click();
    if (d === 0) {
      await page.locator('textarea').fill('Comentario de prueba <script>alert(1)</script>');
      await page.reload();
      await page.getByRole('heading', { name: 'Siniestros', exact: true }).waitFor();
      assert.equal(await page.locator('input[name="rating-0-0"][value="0"]').isChecked(), true);
      assert.ok((await page.locator('textarea').inputValue()).includes('<script>'));
    }
    await page.getByRole('button', { name: d === 2 ? 'Enviar encuesta' : 'Siguiente departamento' }).click();
  }
  await page.getByRole('heading', { name: 'Gracias por ayudarnos a mejorar.' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Gracias por ayudarnos a mejorar.' }).waitFor();
  await page.goto(`${base}/encuesta/acceso`);
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar al panel' }).click();
  await page.getByRole('alert').filter({ hasText: 'incorrectos' }).waitFor();
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar al panel' }).click();
  await page.waitForURL('**/encuesta/resultados');
  await page.getByRole('heading', { name: 'Encuestas individuales' }).waitFor();
  assert.equal(await page.locator('.survey-big-score').first().innerText(), '5,0 / 10');
  await page.screenshot({ path: '.qa/survey-admin-mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('.survey-response-list a').first().click();
  await page.getByRole('heading', { name: 'Detalle de la encuesta' }).waitFor();
  assert.ok((await page.locator('.survey-comment-text').first().innerText()).includes('<script>'));
  const privateURL = page.url();
  const authCookie = (await context.cookies()).find(c => c.name === 'cosnor_survey_admin');
  assert.ok(authCookie.httpOnly);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForURL('**/encuesta/acceso');
  // A copied cookie is also revoked on the server after logout.
  await context.addCookies([authCookie]);
  await page.goto(privateURL);
  await page.waitForURL('**/encuesta/acceso');
  await page.goto(`${base}/`);
  assert.ok(await page.getByText('IV Convención Anual de Cosnor', { exact: true }).count());
  console.log('PASS: mobile survey, validation, reload, submission, protected pages, login, aggregates, escaped comments, logout and cookie revocation.');
} finally { await context.close(); await browser.close(); }

