const test = require('node:test');
const assert = require('node:assert');
const { applyLockState, isExempt, shouldBlock, LOCK_EXEMPT_SELECTOR, BLOCKED_EVENT_TYPES } = require('../src/click-lock');

// Minimal stand-in for a DOM element: closest() returns itself if `selector`
// matches one of its `classes`/ids, mimicking the only cases we actually use.
function fakeTarget(id) {
  return {
    id,
    closest(selector) {
      const wanted = selector.split(',').map((s) => s.trim());
      return wanted.includes('#' + id) ? this : null;
    }
  };
}

test('isExempt matches only the consent scrim and the mic permission banner', () => {
  assert.ok(isExempt(fakeTarget('consent-scrim')));
  assert.ok(isExempt(fakeTarget('mic-perm-banner')));
  assert.strictEqual(isExempt(fakeTarget('more-btn')), false);
  assert.strictEqual(isExempt(fakeTarget('quit-btn')), false);
});

test('isExempt handles missing/non-element targets safely', () => {
  assert.strictEqual(isExempt(null), false);
  assert.strictEqual(isExempt(undefined), false);
  assert.strictEqual(isExempt({}), false);
});

test('shouldBlock never blocks anything while unlocked', () => {
  assert.strictEqual(shouldBlock(false, fakeTarget('quit-btn')), false);
  assert.strictEqual(shouldBlock(false, fakeTarget('consent-scrim')), false);
});

test('shouldBlock blocks ordinary UI while locked, but not exempt dialogs', () => {
  assert.strictEqual(shouldBlock(true, fakeTarget('quit-btn')), true);
  assert.strictEqual(shouldBlock(true, fakeTarget('more-btn')), true);
  assert.strictEqual(shouldBlock(true, fakeTarget('consent-scrim')), false);
  assert.strictEqual(shouldBlock(true, fakeTarget('mic-perm-banner')), false);
});

test('wheel is never in the blocked event list, so scroll always keeps working', () => {
  assert.ok(!BLOCKED_EVENT_TYPES.includes('wheel'));
  assert.ok(!BLOCKED_EVENT_TYPES.includes('scroll'));
});

test('LOCK_EXEMPT_SELECTOR is a valid, non-empty CSS selector string', () => {
  assert.strictEqual(typeof LOCK_EXEMPT_SELECTOR, 'string');
  assert.ok(LOCK_EXEMPT_SELECTOR.includes('#consent-scrim'));
  assert.ok(LOCK_EXEMPT_SELECTOR.includes('#mic-perm-banner'));
});

// Regression test for https://github.com/electron/electron/issues/23106:
// setFocusable() resets skipTaskbar on Windows/Linux, so every toggle must
// reassert it or the window reappears in the taskbar/Alt+Tab.
function fakeWindow() {
  const calls = [];
  return {
    calls,
    setFocusable(v) { calls.push(['setFocusable', v]); },
    setSkipTaskbar(v) { calls.push(['setSkipTaskbar', v]); }
  };
}

test('applyLockState makes the window unfocusable when locking', () => {
  const win = fakeWindow();
  applyLockState(win, true);
  assert.deepEqual(win.calls[0], ['setFocusable', false]);
});

test('applyLockState makes the window focusable again when unlocking', () => {
  const win = fakeWindow();
  applyLockState(win, false);
  assert.deepEqual(win.calls[0], ['setFocusable', true]);
});

test('applyLockState always reasserts skipTaskbar after setFocusable, both directions', () => {
  const lockWin = fakeWindow();
  applyLockState(lockWin, true);
  assert.deepEqual(lockWin.calls, [['setFocusable', false], ['setSkipTaskbar', true]]);

  const unlockWin = fakeWindow();
  applyLockState(unlockWin, false);
  assert.deepEqual(unlockWin.calls, [['setFocusable', true], ['setSkipTaskbar', true]]);
});
