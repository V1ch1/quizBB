import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceGame, answerGame, cleanAlias, createGame, gameView, scoreGame } from '../src/lib/game';

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
