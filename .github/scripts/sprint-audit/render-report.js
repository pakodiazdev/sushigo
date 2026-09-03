'use strict';

// Render an auditSprint() result as the deterministic plain-text closure audit
// described in issue #587 ("Sprint N closure audit"), followed by the explicit
// FAIL / WARN lists and a final verdict line.

const { formatMinutes } = require('./audit.js');

function pad(label, width) {
  return label.length >= width ? label : label + ' '.repeat(width - label.length);
}

function renderReport(result) {
  const lines = [];
  const L = (label, value) => lines.push(`${pad(label, 22)}${value}`);

  lines.push(`Sprint ${result.sprintNumber ?? '?'} closure audit`);
  lines.push('');
  L('Formal scope', `${result.formalScope.total} Issues`);
  L('Closed', String(result.formalScope.closed));
  L('Open', String(result.formalScope.open));
  L('Missing iteration', String(result.missingIteration.length));
  L('Wrong sprint label', String(result.missingSprintLabel.length));
  L('Missing investment', String(result.missingInvestment.length));

  const undisposed = result.uncheckedTasks.undisposed;
  const uncheckedNote =
    undisposed === 0
      ? `${result.uncheckedTasks.total} (all explicitly disposed)`
      : `${result.uncheckedTasks.total} (${undisposed} with no disposition)`;
  L('Unchecked tasks', uncheckedNote);

  const mix = result.investmentMix;
  L(
    'Investment mix',
    `product ${mix['investment: product']} · product-engineering ${mix['investment: product-engineering']} · dev-platform ${mix['investment: dev-platform']}` +
      (mix.unknown ? ` · unknown ${mix.unknown}` : ''),
  );

  L('Formal tracked', formatMinutes(result.formalTrackedMinutes));
  L('Opportunistic tracked', formatMinutes(result.opportunisticTrackedMinutes));
  L('Other same-window', formatMinutes(result.otherSameWindowTrackedMinutes));
  L('Orphan issues', String(result.orphans.length));
  L('Metric confidence', result.metricConfidence);

  if (result.failures.length > 0) {
    lines.push('');
    lines.push(`FAIL (${result.failures.length}) — closure is blocked:`);
    for (const f of result.failures) {
      lines.push(`  - [${f.code}] ${f.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push(`WARN (${result.warnings.length}) — disclosed, not blocking:`);
    for (const w of result.warnings) {
      lines.push(`  - [${w.code}] ${w.message}`);
    }
  }

  lines.push('');
  lines.push(result.ok ? 'RESULT: PASS — no blocking drift detected.' : 'RESULT: FAIL — resolve the items above before closing the sprint.');

  return lines.join('\n');
}

module.exports = { renderReport };
