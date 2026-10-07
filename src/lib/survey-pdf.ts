import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { EVENT } from './config';
import { DEPARTMENTS, SURVEY_QUESTIONS, type SurveyAnswers, type summarizeSurvey } from './survey';

type Summary = ReturnType<typeof summarizeSurvey>;
const plum = rgb(0.412, 0.004, 0.302);
const ink = rgb(0.16, 0.14, 0.16);
const muted = rgb(0.43, 0.4, 0.43);
const score = (n: number | null) => n === null ? 'Sin respuestas' : `${n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 10`;

async function report(title: string, generatedAt: Date) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(join(process.cwd(), 'src/assets/fonts/NotoSans-Regular.ttf')),
    readFile(join(process.cwd(), 'src/assets/fonts/NotoSans-Bold.ttf')),
  ]);
  const regular = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  const charset = new Set(regular.getCharacterSet());
  let substituted = false;
  const clean = (text: string) => Array.from(text.normalize('NFC')).map(char => {
    if (char === '\t') return '    ';
    if (char === '\n') return char;
    if (charset.has(char.codePointAt(0)!)) return char;
    substituted = true;
    return `[U+${char.codePointAt(0)!.toString(16).toUpperCase()}]`;
  }).join('');
  doc.setTitle(`Cosnor - ${title}`); doc.setAuthor('Cosnor'); doc.setCreationDate(generatedAt);
  const date = generatedAt.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'long', timeStyle: 'short' });
  let page: PDFPage;
  let y = 0;
  function newPage(section = '') {
    page = doc.addPage([595.28, 841.89]);
    page.drawText('COSNOR', { x: 44, y: 786, font: bold, size: 25, color: plum });
    page.drawText('INFORME PRIVADO', { x: 431, y: 793, font: regular, size: 8, color: muted });
    page.drawText(title, { x: 44, y: 750, font: bold, size: 19, color: ink });
    page.drawText(EVENT.title, { x: 44, y: 726, font: bold, size: 10, color: plum });
    page.drawText(`${EVENT.date} · ${EVENT.venue}`, { x: 44, y: 710, font: regular, size: 10, color: muted });
    page.drawText(`Generado: ${date} (Europe/Madrid)`, { x: 44, y: 689, font: regular, size: 8, color: muted });
    page.drawLine({ start: { x: 44, y: 675 }, end: { x: 551, y: 675 }, color: rgb(.88, .85, .88), thickness: 1 });
    y = 651;
    if (section) { text(section, 16, true); y -= 8; }
  }
  function ensure(height: number) { if (y - height < 83) newPage('Continuación'); }
  function text(value: string, size = 10, strong = false, width = 507) {
    const font = strong ? bold : regular;
    // Measure every line, including long unbroken words, rather than clipping comments.
    for (const paragraph of clean(value.replace(/\r\n?/g, '\n')).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/( +)/)) {
        if (font.widthOfTextAtSize(line + word, size) <= width) { line += word; continue; }
        if (line.trim()) { drawLine(line.trimEnd()); line = ''; }
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > width) { drawLine(line); line = ''; }
          line += char;
        }
      }
      drawLine(line.trimEnd());
    }
    function drawLine(line: string) {
      ensure(size * 1.55);
      page.drawText(line, { x: 44, y, font, size, color: strong ? plum : ink });
      y -= size * 1.55;
    }
  }
  function gap(amount = 12) { y -= amount; }
  function distribution(counts: number[]) {
    ensure(48);
    const cell = 507 / 11;
    for (let n = 0; n <= 10; n++) {
      const x = 44 + n * cell;
      page.drawRectangle({ x, y: y - 19, width: cell - 2, height: 19, color: rgb(.95, .92, .95) });
      page.drawText(String(n), { x: x + 5, y: y - 13, font: bold, size: 9, color: plum });
      page.drawText(String(counts[n]), { x: x + 5, y: y - 33, font: regular, size: 9, color: ink });
    }
    y -= 42;
  }
  async function save() {
    const pages = doc.getPages();
    pages.forEach((p, i) => {
      p.drawLine({ start: { x: 44, y: 64 }, end: { x: 551, y: 64 }, color: rgb(.88, .85, .88), thickness: 1 });
      p.drawText('Equipo de desarrollo · www.blancoyenbatea.com', { x: 44, y: 47, font: regular, size: 8, color: muted });
      p.drawText(`${i + 1} / ${pages.length}`, { x: 516, y: 47, font: regular, size: 8, color: muted });
      if (substituted) p.drawText('Los símbolos sin glifo se conservan como códigos Unicode [U+...].', { x: 44, y: 32, font: regular, size: 7, color: muted });
    });
    return doc.save();
  }
  return { newPage, text, gap, ensure, distribution, save };
}

export async function globalSurveyPdf(summary: Summary, generatedAt = new Date()) {
  const r = await report('Estadísticas globales de la encuesta', generatedAt);
  r.newPage('Resumen general');
  r.text(`${summary.total} encuestas completas recibidas`, 18, true); r.gap(20);
  for (const [d, name] of DEPARTMENTS.entries()) {
    r.text(name, 14, true); r.text(`Media del departamento: ${score(summary.departments[d])}`, 12); r.gap(20);
  }
  r.text('Las medias incluyen todas las valoraciones, también los ceros. Cada departamento contiene seis preguntas valoradas de 0 a 10.'); r.gap();
  r.text('La distribución indica el número de respuestas que ha recibido cada puntuación. Este informe incluye todas las encuestas de la convención, no solo la página visible en el panel.'); r.gap();
  r.text('Las respuestas son anónimas. Los comentarios se consultan y exportan en cada cuestionario individual.');
  if (!summary.total) { r.gap(); r.text('Todavía no hay respuestas. No se calculan medias hasta recibir la primera encuesta.', 11, true); }
  for (const [d, name] of DEPARTMENTS.entries()) {
    r.newPage(name);
    r.text(`Media: ${score(summary.departments[d])} · ${summary.total} ${summary.total === 1 ? 'respuesta' : 'respuestas'} por pregunta`, 10); r.gap(6);
    r.text('Tabla: puntuación (fila superior) / número de respuestas (fila inferior)', 8); r.gap(6);
    for (const [q, question] of SURVEY_QUESTIONS.entries()) {
      r.ensure(75);
      r.text(`${q + 1}. ${question}`, 10, true);
      r.text(`Media: ${score(summary.questions[d][q].average)}`, 9);
      r.distribution(summary.questions[d][q].distribution); r.gap(12);
    }
  }
  return r.save();
}

export async function individualSurveyPdf(response: SurveyAnswers & { id: string }, generatedAt = new Date()) {
  const r = await report('Cuestionario individual anónimo', generatedAt);
  for (const [d, name] of DEPARTMENTS.entries()) {
    r.newPage(name);
    r.text(`Referencia: ${response.id}`, 8); r.gap();
    for (const [q, question] of SURVEY_QUESTIONS.entries()) {
      r.ensure(70); r.text(`${q + 1}. ${question}`, 11, true);
      r.text(`Valoración: ${response.ratings[d][q]} / 10`, 11); r.gap(10);
    }
    r.ensure(65); r.text('7. Si pudieras, ¿qué mejorarías?', 11, true); r.gap(6);
    r.text(response.comments[d] || 'Sin comentario.', 10);
  }
  return r.save();
}

export function pdfDownload(bytes: Uint8Array, filename: string) {
  return new Response(new Uint8Array(bytes), { headers: {
    'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}
