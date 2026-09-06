// Session history — a running multi-turn conversation shared across repeated
// Assist/Ask/Leetcode executions in one sitting, analogous to a Claude Code
// session. Cleared on demand (shortcut/button), never persisted to disk.
//
// Only committed as whole {user, assistant} pairs, and only when the assistant
// side is non-empty: Anthropic requires strict user/assistant alternation
// starting with 'user' and 400s on two consecutive same-role turns, so a
// timed-out/errored call must never leave a dangling unanswered user turn.

const SHARED_MODES = new Set(['assist', 'ask', 'leetcode']);

function isSharedMode(mode) {
  return SHARED_MODES.has(mode);
}

function createSessionHistory({ maxPairs = 40 } = {}) {
  let turns = []; // flat [{role:'user',text}, {role:'assistant',text}, ...]

  return {
    getTurns(mode) {
      return isSharedMode(mode) ? turns.map((t) => ({ ...t })) : [];
    },
    commitPair(mode, userText, assistantText) {
      if (!isSharedMode(mode)) return;
      if (!assistantText || !assistantText.trim()) return;
      turns.push({ role: 'user', text: userText || '' }, { role: 'assistant', text: assistantText });
      while (turns.length > maxPairs * 2) turns.splice(0, 2);
    },
    clear() {
      turns = [];
    }
  };
}

module.exports = { createSessionHistory, isSharedMode, SHARED_MODES };
