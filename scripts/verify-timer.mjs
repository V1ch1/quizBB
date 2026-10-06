import { chromium, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';

// This test creates and deletes only its own session in the LOCAL database.
const baseURL = 'http://localhost:3000';
const browser = await chromium.connectOverCDP(process.argv[2]);
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
// Simulate a participant whose clock is one hour ahead of the server.
await context.addInitScript(() => { const original = Date.now; Date.now = () => original() + 3600000; });
const page = await context.newPage();
let publicId;
const session = async () => (await (await context.request.get(`${baseURL}/api/session`)).json()).game;
mkdirSync('.qa', { recursive: true });
try {
  await page.goto(baseURL);
  await expect(page.locator('.event-banner')).toContainText('Convención Anual de Cosnor');
  await expect(page.locator('.event-banner')).toContainText('23 de octubre de 2026');
  await expect(page.locator('.event-banner')).toContainText('Estadio de Riazor');
  await page.getByRole('button', { name: 'Acepto el reto', exact: true }).click();
  await page.getByLabel('Tu alias', { exact: true }).fill('QA Reloj');
  await page.getByRole('button', { name: 'Entrar al campo' }).click();
  await page.getByRole('button', { name: 'Empezar ronda 1' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  const first = await session();
  publicId = first.publicId;
  expect(first.questionDeadline - first.serverNow).toBeGreaterThan(10000);
  expect(first.questionDeadline - first.serverNow).toBeLessThanOrEqual(15000);
  await expect.poll(async () => Number(await page.getByRole('timer').locator('b').innerText())).toBeLessThanOrEqual(12);
  await page.reload();
  await expect(page.getByRole('timer')).toBeVisible();
  expect((await session()).questionDeadline).toBe(first.questionDeadline);
  // Selecting without confirming must not earn points.
  await page.locator('.answer').first().click();
  await expect(page.getByRole('status')).toContainText('¡Tiempo agotado!', { timeout: 17000 });
  const timedOut = await session();
  expect(timedOut.score).toBe(0);
  expect(timedOut.feedback.timedOut).toBe(true);
  expect(timedOut.feedback.selected).toBeNull();
  await page.screenshot({ path: '.qa/timer-expired-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Siguiente pregunta', exact: true }).click();
  await expect(page.getByRole('timer').locator('b')).toHaveText(/1[0-5]/);
  const second = await session();
  expect(second.index).toBe(1);
  expect(second.questionDeadline).toBeGreaterThan(first.questionDeadline);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.qa/timer-running-mobile.png', fullPage: true });
  // A failed expiry request is retried after connectivity returns, without resetting time.
  await context.setOffline(true);
  await expect(page.getByRole('timer').locator('b')).toHaveText('00', { timeout: 17000 });
  await expect(page.getByRole('button', { name: 'Confirmar respuesta', exact: true })).toBeDisabled();
  await context.setOffline(false);
  await expect(page.getByRole('status')).toContainText('¡Tiempo agotado!', { timeout: 10000 });
  expect((await session()).score).toBe(0);
  console.log('PASS: event details, 15-second countdown, skewed client clock, reload preserves deadline, unconfirmed answer earns zero, timeout persists, fresh next-question timer, offline expiry/retry, 320px layout.');
} finally {
  await context.close();
  if (publicId) {
    const db = new DatabaseSync('.data/quiz.sqlite');
    db.prepare('DELETE FROM quiz_games WHERE public_id = ?').run(publicId);
    db.close();
  }
  await browser.close();
}
