import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceGame, answerGame, cleanAlias, createGame, expireGame, gameView, reconcileClock, scoreGame } from '../src/lib/game';

test('all 24 imported questions have exactly one valid answer and four rounds', () => {
  const game = createGame('Equipo Cosnor');
  assert.equal(game.questions.length, 24);
  for (let round = 1; round <= 4; round++) assert.equal(game.questions.filter(q => q.round === round).length, 6);
  for (const q of game.questions) {
    assert.equal(q.options.length, 4);
    assert.equal(q.options.filter(o => o.id === q.correct).length, 1);
    assert.ok(q.options.every(o => o.id.length > 20));
  }
  assert.equal(game.questions[15].options.find(o => o.id === game.questions[15].correct)?.text, 'Una cafetería');
});
test('answer keys and future questions stay off the public game view', () => {
  let game = createGame('Jugador');
  assert.equal(gameView(game).question, null);
  game = advanceGame(game);
  const view = gameView(game);
  assert.ok(view.question);
  assert.ok(!('correct' in view.question));
  assert.equal(view.feedback, null);
  assert.ok(!('questions' in view));
  assert.ok(!('id' in view));
});
test('complete game scores exactly 2400 and cannot be replayed or scored twice', () => {
  let game = createGame('Campeón');
  const stages: number[] = [];
  for (let index = 0; index < 24; index++) {
    if (game.stage === 'intro') { stages.push(game.questions[index].round); game = advanceGame(game); }
    const q = game.questions[index];
    game = answerGame(game, q.id, q.correct);
    assert.throws(() => answerGame(game, q.id, q.correct));
    assert.equal(scoreGame(game).score, (index + 1) * 100);
    game = advanceGame(game);
  }
  assert.deepEqual(stages, [1, 2, 3, 4]);
  assert.equal(game.stage, 'result');
  assert.ok(game.finishedAt);
  assert.deepEqual(scoreGame(game), { score: 2400, correctCount: 24 });
  assert.throws(() => advanceGame(game));
});
test('wrong answers do not score; invalid and out-of-order answers are rejected', () => {
  let game = createGame('Prueba');
  assert.throws(() => answerGame(game, 1, game.questions[0].correct));
  game = advanceGame(game);
  assert.throws(() => advanceGame(game));
  assert.throws(() => answerGame(game, 2, game.questions[0].correct));
  assert.throws(() => answerGame(game, 1, 'tampered'));
  const q = game.questions[0];
  game = answerGame(game, q.id, q.options.find(o => o.id !== q.correct)!.id);
  assert.equal(gameView(game).feedback?.isCorrect, false);
  assert.equal(scoreGame(game).score, 0);
});
test('aliases are normalized and invalid public input is rejected', () => {
  assert.equal(cleanAlias('  Dépor   90  '), 'Dépor 90');
  for (const alias of ['', 'A', 'x'.repeat(21), '<script>', 'a\u202Eb', 123, null]) assert.throws(() => cleanAlias(alias));
});

test('15-second deadline accepts a confirmed answer before the limit but never at or after it', () => {
  const game = advanceGame(createGame('Reloj'), 1000);
  const q = game.questions[0];
  assert.equal(game.questionDeadline, 16000);
  assert.equal(scoreGame(answerGame(game, q.id, q.correct, 15999)).score, 100);
  for (const now of [16000, 16001, 999999]) {
    const late = answerGame(game, q.id, q.correct, now);
    assert.equal(late.stage, 'feedback');
    assert.equal(scoreGame(late).score, 0);
    assert.equal(gameView(late).feedback?.timedOut, true);
    assert.equal(late.answers[q.id], null);
    assert.throws(() => answerGame(late, q.id, q.correct, now));
  }
});

test('expiration is idempotent, early expiration is ignored, and the next question gets a fresh deadline', () => {
  const game = advanceGame(createGame('Reloj'), 1000);
  assert.equal(expireGame(game, 15999), game);
  const expired = expireGame(game, 16000);
  assert.equal(expired.revision, game.revision + 1);
  assert.equal(expireGame(expired, 17000), expired);
  assert.equal(expired.questionDeadline, null);
  const next = advanceGame(expired, 20000);
  assert.equal(next.questionDeadline, 35000);
  assert.equal(next.index, 1);
  assert.equal(scoreGame(next).score, 0);
});

test('reload and legacy session migration never extend an established deadline', () => {
  const game = advanceGame(createGame('Recarga'), 1000);
  assert.equal(reconcileClock(game, 9000), game);
  assert.equal(gameView(game, 9000).questionDeadline, 16000);
  assert.equal(gameView(game, 9000).serverNow, 9000);
  assert.equal(reconcileClock(game, 16000).stage, 'feedback');
  const legacy = { ...game, questionDeadline: undefined };
  const migrated = reconcileClock(legacy, 40000);
  assert.equal(migrated.questionDeadline, 55000);
  assert.equal(reconcileClock(migrated, 50000), migrated);
  assert.equal(reconcileClock(migrated, 55000).stage, 'feedback');
});

test('round intro and feedback pauses do not consume another question timer', () => {
  let game = createGame('Rondas');
  assert.equal(reconcileClock(game, 999999), game);
  game = advanceGame(game, 1000);
  for (let i = 0; i < 6; i++) {
    game = answerGame(game, game.questions[i].id, game.questions[i].correct, 1001 + i);
    assert.equal(game.questionDeadline, null);
    game = advanceGame(game, 1002 + i);
  }
  assert.equal(game.stage, 'intro');
  assert.equal(game.questionDeadline, null);
  assert.equal(reconcileClock(game, 999999), game);
  assert.equal(advanceGame(game, 999999).questionDeadline, 1014999);
});
