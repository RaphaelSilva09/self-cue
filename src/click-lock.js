// Click-lock: while locked, the window can never become the OS-active/foreground
// window, so focus never leaves whatever app the user was using.
//
// On Windows, focusable:false maps to WS_EX_NOACTIVATE — a real, native
// "non-activating window" style. Clicking such a window does NOT give it focus,
// but mouse events (click, wheel) still reach it normally, so the renderer can
// keep scrolling working and just neutralize click handlers itself.
// (On macOS, Electron's focusable:false does not reliably stop a click from
// activating the window — https://github.com/electron/electron/issues/29644 —
// so the guarantee below is Windows-specific; macOS support is best-effort.)
//
// setFocusable() has a documented side effect on Windows/Linux of resetting
// skipTaskbar — https://github.com/electron/electron/issues/23106 — so it must
// be reasserted every time we toggle, or the window would reappear in the
// taskbar and break the screen-share invisibility feature.
function applyLockState(win, locked) {
  win.setFocusable(!locked);
  win.setSkipTaskbar(true);
}

// UI that can appear unprompted (an inbound app-link request, a permission
// nudge) and needs a reply stays clickable no matter the lock state.
const LOCK_EXEMPT_SELECTOR = '#consent-scrim, #mic-perm-banner';

function isExempt(target) {
  return !!(target && typeof target.closest === 'function' && target.closest(LOCK_EXEMPT_SELECTOR));
}

function shouldBlock(locked, target) {
  if (!locked) return false;
  return !isExempt(target);
}

// Event types blocked while locked. 'wheel' is deliberately excluded so scroll keeps working.
const BLOCKED_EVENT_TYPES = ['click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'auxclick'];

module.exports = { applyLockState, isExempt, shouldBlock, LOCK_EXEMPT_SELECTOR, BLOCKED_EVENT_TYPES };
