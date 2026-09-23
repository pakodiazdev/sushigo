'use strict';

// Renders migration-guard scan results as a Markdown step summary plus GitHub workflow-command
// annotations. `block` mode (Production's pipeline) fails on any unacknowledged finding; `warn`
// mode (PR CI) only annotates, so a destructive migration is visible at review time long before
// it reaches the automated Production promotion.

const escapeData = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProp = (s) => escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

function renderReport(results, mode) {
  const annotations = [];
  const lines = ['### 🧱 Destructive migration guard', ''];
  const flagged = results.filter((r) => r.findings.length > 0);
  const blocking = flagged.filter((r) => r.blocking);
  const failed = mode === 'block' && blocking.length > 0;

  if (results.length === 0) {
    lines.push('No migrations changed in this range — nothing to check.');
    return { failed: false, summary: lines.join('\n') + '\n', annotations };
  }

  if (flagged.length === 0) {
    lines.push(`✅ ${results.length} migration(s) scanned — no destructive operations found.`);
    return { failed: false, summary: lines.join('\n') + '\n', annotations };
  }

  const level = mode === 'block' ? 'error' : 'warning';
  for (const r of flagged) {
    for (const f of r.findings) {
      if (r.blocking) {
        annotations.push(
          `::${level} file=${escapeProp(r.path)},line=${f.line},title=${escapeProp(`Destructive migration (${f.rule})`)}::${escapeData(f.snippet)}`,
        );
      } else {
        annotations.push(
          `::notice file=${escapeProp(r.path)},line=${f.line},title=${escapeProp(`Acknowledged destructive migration (${f.rule})`)}::${escapeData(r.acknowledged)}`,
        );
      }
    }
  }

  const icon = failed ? '❌' : blocking.length > 0 ? '⚠️' : '✅';
  lines.push(
    `${icon} ${results.length} migration(s) scanned — ${blocking.length} with unacknowledged destructive operations, ` +
      `${flagged.length - blocking.length} acknowledged.`,
    '',
    '| Migration | Line | Rule | Status |',
    '|---|---|---|---|',
  );
  for (const r of flagged) {
    for (const f of r.findings) {
      const status = r.blocking ? 'unacknowledged' : `acknowledged — ${r.acknowledged.replace(/\|/g, '\\|')}`;
      lines.push(`| \`${r.path}\` | ${f.line} | \`${f.rule}\` | ${status} |`);
    }
  }
  if (blocking.length > 0) {
    lines.push(
      '',
      'Production runs migrations while the previous revision still serves traffic, so these operations can break it and ' +
        'cannot be undone by an application rollback (TD-07). Either split the change expand/contract-style, or — once the ' +
        'running release no longer uses what is dropped — add `// migration-guard: allow <reason>` to the migration. ' +
        'See doc/conventions/ci/deployment.md → "Destructive migration guard".',
    );
  }
  return { failed, summary: lines.join('\n') + '\n', annotations };
}

module.exports = { renderReport };
