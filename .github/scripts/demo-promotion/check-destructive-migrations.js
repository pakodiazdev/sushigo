#!/usr/bin/env node
'use strict';

// CLI: node check-destructive-migrations.js <base-sha> <head-sha>
//
// Scans every migration added, modified or renamed between the environment's watermark (<base-sha>)
// and the candidate commit (<head-sha>) — i.e. exactly the migrations this promotion would run —
// and exits 1 with a GitHub annotation per destructive operation. See destructive-migrations.js.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { scanMigrations } = require('./destructive-migrations.js');

const MIGRATIONS_DIR = 'code/api/database/migrations';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function main([base, head]) {
  if (!base || !head) {
    console.error('Usage: check-destructive-migrations.js <base-sha> <head-sha>');
    return 2;
  }

  const paths = git(['diff', '--name-only', '--diff-filter=AMR', `${base}`, `${head}`, '--', MIGRATIONS_DIR])
    .split('\n')
    .filter((p) => p.endsWith('.php'));

  const findings = scanMigrations(paths.map((path) => ({ path, source: git(['show', `${head}:${path}`]) })));

  const lines = [`### 🗄️ Destructive-migration guard — ${paths.length} migration(s) in range`, ''];
  if (findings.length === 0) {
    console.log(`✅ No destructive operations in ${paths.length} migration(s) between ${base} and ${head}`);
    lines.push('- ✅ No destructive operations — expand/contract-compatible');
  } else {
    for (const f of findings) {
      console.log(`::error file=${f.path},line=${f.line}::Destructive migration operation (${f.operation}) — not a candidate for automated Demo promotion: ${f.text}`);
      lines.push(`- ❌ \`${f.path}:${f.line}\` — ${f.operation}`);
    }
    lines.push('', 'Apply this release to Demo through a planned maintenance procedure, then advance the watermark with the `demo-ops` workflow.');
  }
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);

  return findings.length === 0 ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main };
