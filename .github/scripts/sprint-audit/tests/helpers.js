'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FIXTURES = path.join(__dirname, 'fixtures');

function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

// Build a minimal but realistic GitHub Issue body with a Sessions block and an
// optional Technical Tasks checklist.
function issueBody({ sessions = [], tasks = [], sessionsRaw = null } = {}) {
  const taskBlock =
    tasks.length > 0
      ? `## ✅ Technical Tasks\n${tasks
          .map((t) => `- [${t.done ? 'x' : ' '}] ${t.text}`)
          .join('\n')}\n\n`
      : '';
  const sessionsJson = sessionsRaw ?? JSON.stringify(sessions, null, 2);
  return (
    `## Description\n\nSynthetic issue body for audit tests.\n\n` +
    taskBlock +
    `## ⏱️ Time\n\n### 📊 Estimates\n- **Optimistic:** \`1h\` · **Pessimistic:** \`2h\` · **Tracked:** _in progress_\n\n` +
    `### 📅 Sessions\n\`\`\`json\n${sessionsJson}\n\`\`\`\n`
  );
}

// A fully-consistent scoped Issue record — every override in `patch` peels one
// source out of alignment for a specific test.
function scopedIssue(number, patch = {}) {
  return {
    number,
    state: 'CLOSED',
    projectStatus: 'Done',
    projectIterationId: 'iter-42',
    labels: ['sprint-42', 'investment: product'],
    body: issueBody({
      sessions: [{ date: '2026-09-02', start: '10:00', end: '11:00' }],
      tasks: [{ text: 'Ship it', done: true }],
    }),
    ...patch,
  };
}

module.exports = { readFixture, issueBody, scopedIssue, FIXTURES };
