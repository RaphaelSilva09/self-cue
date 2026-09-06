const test = require('node:test');
const assert = require('node:assert');
const { createSessionHistory, isSharedMode } = require('../src/session-history');

test('isSharedMode is true only for assist/ask/leetcode', () => {
  assert.ok(isSharedMode('assist'));
  assert.ok(isSharedMode('ask'));
  assert.ok(isSharedMode('leetcode'));
  assert.strictEqual(isSharedMode('say'), false);
  assert.strictEqual(isSharedMode('followup'), false);
  assert.strictEqual(isSharedMode('recap'), false);
  assert.strictEqual(isSharedMode('answerThis'), false);
  assert.strictEqual(isSharedMode('unknown-mode'), false);
});

test('getTurns is empty before anything is committed', () => {
  const history = createSessionHistory();
  assert.deepEqual(history.getTurns('assist'), []);
});

test('commitPair appends a user/assistant pair for a shared mode', () => {
  const history = createSessionHistory();
  history.commitPair('assist', 'what should I say', 'Say this.');
  assert.deepEqual(history.getTurns('assist'), [
    { role: 'user', text: 'what should I say' },
    { role: 'assistant', text: 'Say this.' }
  ]);
});

test('commitPair is a no-op for a non-shared mode', () => {
  const history = createSessionHistory();
  history.commitPair('say', 'hello', 'hi there');
  assert.deepEqual(history.getTurns('say'), []);
  assert.deepEqual(history.getTurns('assist'), []);
});

test('commitPair never leaves a dangling unanswered user turn (empty/whitespace assistant text)', () => {
  const history = createSessionHistory();
  history.commitPair('assist', 'first question', '');
  history.commitPair('assist', 'second question', '   ');
  assert.deepEqual(history.getTurns('assist'), []);
});

test('a pair committed under one shared mode is visible from every other shared mode', () => {
  const history = createSessionHistory();
  history.commitPair('assist', 'q1', 'a1');
  assert.deepEqual(history.getTurns('ask'), [
    { role: 'user', text: 'q1' },
    { role: 'assistant', text: 'a1' }
  ]);
  assert.deepEqual(history.getTurns('leetcode'), [
    { role: 'user', text: 'q1' },
    { role: 'assistant', text: 'a1' }
  ]);
});

test('alternation invariant holds after many commits: even indices user, odd indices assistant', () => {
  const history = createSessionHistory();
  for (let i = 0; i < 10; i++) history.commitPair('assist', `q${i}`, `a${i}`);
  const turns = history.getTurns('assist');
  assert.strictEqual(turns.length, 20);
  turns.forEach((t, i) => {
    assert.strictEqual(t.role, i % 2 === 0 ? 'user' : 'assistant');
  });
});

test('FIFO trim caps history at maxPairs pairs and preserves alternation', () => {
  const history = createSessionHistory({ maxPairs: 3 });
  for (let i = 0; i < 5; i++) history.commitPair('assist', `q${i}`, `a${i}`);
  const turns = history.getTurns('assist');
  assert.strictEqual(turns.length, 6);
  assert.strictEqual(turns[0].role, 'user');
  assert.strictEqual(turns[0].text, 'q2');
  assert.strictEqual(turns[turns.length - 1].text, 'a4');
});

test('getTurns returns a defensive copy — mutating it does not corrupt internal state', () => {
  const history = createSessionHistory();
  history.commitPair('assist', 'q', 'a');
  const turns = history.getTurns('assist');
  turns.push({ role: 'user', text: 'injected' });
  turns[0].text = 'mutated';
  assert.deepEqual(history.getTurns('assist'), [
    { role: 'user', text: 'q' },
    { role: 'assistant', text: 'a' }
  ]);
});

test('clear() empties history for all shared modes', () => {
  const history = createSessionHistory();
  history.commitPair('assist', 'q', 'a');
  history.clear();
  assert.deepEqual(history.getTurns('assist'), []);
  assert.deepEqual(history.getTurns('ask'), []);
  assert.deepEqual(history.getTurns('leetcode'), []);
});
