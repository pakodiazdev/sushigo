'use strict';

// Usage: node cli.js --mode=block|warn --base=<commit> --head=<commit>
//
// Scans every migration added, modified or renamed between <base> and <head> (contents read at
// <head>), prints annotations, appends the Markdown report to $GITHUB_STEP_SUMMARY when set, and
// exits 1 only in block mode with at least one unacknowledged destructive operation. Commits are
// passed to git as argv entries (never through a shell), so a ref can't inject commands.

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { scanMigration, isMigrationPath } = require('./scan.js');
const { renderReport } = require('./report.js');

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
}

const mode = arg('mode');
const base = arg('base');
const head = arg('head');
if (!['block', 'warn'].includes(mode) || !base || !head) {
  console.error('Usage: node cli.js --mode=block|warn --base=<commit> --head=<commit>');
  process.exit(2);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const paths = git('diff', '--name-only', '--diff-filter=AMR', `${base}...${head}`, '--', 'code/api/database/migrations')
  .split('\n')
  .filter(isMigrationPath);

const results = paths.map((p) => scanMigration(p, git('show', `${head}:${p}`)));
const { failed, summary, annotations } = renderReport(results, mode);

annotations.forEach((a) => console.log(a));
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
process.exit(failed ? 1 : 0);
