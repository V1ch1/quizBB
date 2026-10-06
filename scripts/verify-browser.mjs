import { chromium, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

// Attach only to the isolated browser opened for this project's QA.
const browser = await chromium.connectOverCDP(process.argv[2]);
const baseURL = process.env.QUIZ_TEST_URL || 'http://localhost:3000';
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('ERR_INTERNET_DISCONNECTED')) errors.push(msg.text()); });
const questions = JSON.parse(readFileSync('src/data/questions.json', 'utf8'));
mkdirSync('.qa', { recursive: true });
let publicId;
try {
  await page.goto(baseURL);
  await expect(page.getByRole('button', { name: 'Acepto el reto', exact: true })).toBeEnabled();
  await page.screenshot({ path: '.qa/home-desktop.png', fullPage: true });
  const sizes = [{ width: 320, height: 740 }, { width: 360, height: 800 },
    { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 },
    { width: 844, height: 390 }, { width: 768, height: 1024 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const credit = page.locator('.footer-credit');
    await expect(credit).toBeVisible();
    await expect(credit).toContainText('Desarrollado por el equipo de desarrollo de');
    await expect(credit.getByRole('link')).toHaveAttribute('href', 'https://www.blancoyenbata.com');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.qa/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Cómo se juega', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Clasificación', exact: true }).click();
  await expect(page.getByText('El primer puesto está esperando.')).toBeVisible();
  await page.getByRole('button', { name: 'Acepto el reto', exact: true }).click();
  await page.getByLabel('Tu alias', { exact: true }).fill('QA Móvil');
  await page.getByRole('button', { name: 'Entrar al campo' }).click();
  await expect(page.getByRole('button', { name: 'Empezar ronda 1' })).toBeVisible();
  publicId = (await (await context.request.get(`${baseURL}/api/session`)).json()).game.publicId;
  let expectedScore = 0;
  for (let i = 0; i < questions.length; i++) {
    await page.setViewportSize(sizes[i % sizes.length]);
    if (i % 6 === 0) await page.getByRole('button', { name: `Empezar ronda ${Math.floor(i / 6) + 1}` }).click();
    await expect(page.getByRole('heading', { name: questions[i].text, exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (sizes[i % sizes.length].width <= 430) {
      for (const selector of ['.answer', '.help-button', '.nav-link', '.question-actions .button']) {
        const bounds = await page.locator(selector).first().boundingBox();
        expect(bounds.height).toBeGreaterThanOrEqual(44);
      }
    }
    await expect(page.getByRole('button', { name: 'Confirmar respuesta', exact: true })).toBeDisabled();
    const before = (await (await context.request.get(`${baseURL}/api/session`)).json()).game;
    expect(before.question.id).toBe(i + 1);
    expect(before.question.correct).toBeUndefined();
    expect(before.feedback).toBeNull();
    const chooseWrong = i % 3 === 0;
    const option = questions[i].options.find(o => chooseWrong ? o.id !== questions[i].correct : o.id === questions[i].correct);
    await page.getByRole('button').filter({ hasText: option.text }).filter({ has: page.locator('.answer-letter') }).click();
    if (i === 0) {
      await page.screenshot({ path: '.qa/question-mobile.png', fullPage: true });
      await context.setOffline(true);
      await page.getByRole('button', { name: 'Confirmar respuesta', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'No hay conexión' })).toBeVisible();
      await context.setOffline(false);
    }
    await page.getByRole('button', { name: 'Confirmar respuesta', exact: true }).click();
    await expect(page.getByRole('status')).toBeVisible();
    if (!chooseWrong) expectedScore += 100;
    const after = (await (await context.request.get(`${baseURL}/api/session`)).json()).game;
    expect(after.score).toBe(expectedScore);
    expect(after.feedback.isCorrect).toBe(!chooseWrong);
    if (i === 4) {
      await page.reload();
      await expect(page.getByRole('status')).toBeVisible();
      const restored = (await (await context.request.get(`${baseURL}/api/session`)).json()).game;
      expect(restored.score).toBe(expectedScore);
      expect(restored.revision).toBe(after.revision);
    }
    if (i === 8) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: '.qa/question-desktop.png', fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      // Let the resize and media-query layout settle before inspecting geometry.
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'absolute').map(e => ({ tag: e.tagName, cls: e.className, right: e.getBoundingClientRect().right })).slice(0, 12) }));
    if (overflow.scroll > overflow.width) {
      await page.screenshot({ path: '.qa/overflow.png', fullPage: true });
      console.log('Overflow at question', i + 1, JSON.stringify(overflow));
    }
    expect(overflow.scroll <= overflow.width).toBe(true);
    const next = i === 23 ? 'Ver mi resultado' : (i + 1) % 6 === 0 ? 'Siguiente ronda' : 'Siguiente pregunta';
    await page.getByRole('button', { name: next, exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Ver la clasificación' })).toBeVisible();
  await expect(page.locator('.final-score strong')).toHaveText('1600');
  await page.screenshot({ path: '.qa/result-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Ver la clasificación' }).click();
  await expect(page.locator('.own-row')).toContainText('QA Móvil');
  await expect(page.locator('.own-row')).toContainText('1600');
  await page.screenshot({ path: '.qa/ranking-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const other = await browser.newContext();
  const shared = await (await other.request.get(`${baseURL}/api/leaderboard`)).json();
  expect(shared.entries.some(row => row.publicId === publicId && row.score === 1600)).toBe(true);
  expect(shared.own).toBeNull();
  const guest = await (await other.request.get(`${baseURL}/api/session`)).json();
  expect(guest.game).toBeNull();
  await other.close();
  expect(errors).toEqual([]);
  console.log('PASS: 320/360/375/390/430px, landscape/tablet/desktop, touch targets, agency footer, rules, 24 questions, score, offline retry, reload recovery, shared ranking, no overflow or browser errors.');
} finally {
  await context.close();
  // Remove only the exact session created by this test, never user records.
  if (publicId && !process.env.DATABASE_URL) {
    const db = new DatabaseSync(process.env.QUIZ_SQLITE_PATH || '.data/quiz.sqlite');
    db.prepare('DELETE FROM quiz_games WHERE public_id = ?').run(publicId);
    db.close();
  }
  await browser.close();
}
