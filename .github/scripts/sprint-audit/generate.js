#!/usr/bin/env node
'use strict';

// Sprint-closure reconciliation audit (issue #587).
//
//   node .github/scripts/sprint-audit/generate.js [--sprint-doc <path>] [--json] [--allow-fail]
//
// Exits non-zero when a FAIL-class drift is found, so it can gate `/close-sprint`
// and the sprint-doc §18 checklist. `--allow-fail` turns it into a report-only
// dry run. Full contract: doc/conventions/sprint-closure-audit.md.

const fs = require('node:fs');
const path = require('node:path');

const { parseSprintDoc } = require('./parse-sprint-doc.js');
const { auditSprint } = require('./audit.js');
const { renderReport } = require('./render-report.js');
const { fetchAuditData } = require('./fetch-data.js');

function parseArgs(argv) {
  const opts = {
    sprintDoc: null,
    owner: process.env.PROJECT_OWNER || 'pakodiazdev',
    repo: process.env.AUDIT_REPO || 'sushigo',
    projectNumber: Number(process.env.PROJECT_NUMBER || 7),
    json: false,
    allowFail: false,
    today: null,
  };
  const takeValue = (flag, i) => {
    const v = argv[i + 1];
    if (v == null || v === '' || v.startsWith('--')) {
      throw new Error(`${flag} requires a value`);
    }
    return v;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--sprint-doc':
        opts.sprintDoc = takeValue(arg, i);
        i += 1;
        break;
      case '--owner':
        opts.owner = takeValue(arg, i);
        i += 1;
        break;
      case '--repo':
        opts.repo = takeValue(arg, i);
        i += 1;
        break;
      case '--project':
        opts.projectNumber = Number(takeValue(arg, i));
        i += 1;
        break;
      case '--today':
        opts.today = takeValue(arg, i);
        i += 1;
        break;
      case '--json':
        opts.json = true;
        break;
      case '--allow-fail':
        opts.allowFail = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

// Highest-numbered doc/sprints/sprint-NNN-*.md that is not the README.
function resolveCurrentSprintDoc(repoRoot) {
  const dir = path.join(repoRoot, 'doc', 'sprints');
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^sprint-\d{3}-.*\.md$/.test(f))
    .sort();
  if (files.length === 0) {
    throw new Error(`No sprint documents found under ${dir}`);
  }
  return path.join(dir, files[files.length - 1]);
}

const HELP = `sprint-audit — reconcile a sprint's closure evidence before it is marked Completed

Usage:
  node .github/scripts/sprint-audit/generate.js [options]

Options:
  --sprint-doc <path>  Sprint document to audit (default: current sprint under doc/sprints/)
  --owner <login>      GitHub owner            (default: pakodiazdev / $PROJECT_OWNER)
  --repo <name>        GitHub repo             (default: sushigo / $AUDIT_REPO)
  --project <number>   Projects v2 number      (default: 7 / $PROJECT_NUMBER)
  --today <YYYY-MM-DD> Override "today" for the sprint window (default: system date)
  --json               Emit the raw audit result as JSON instead of the text report
  --allow-fail         Always exit 0 (report-only dry run)
  -h, --help           Show this help

Requires a token in $GH_TOKEN or $PROJECTS_TOKEN.`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(HELP);
    return;
  }

  const repoRoot = path.join(__dirname, '..', '..', '..');
  const sprintDocPath = opts.sprintDoc
    ? path.resolve(opts.sprintDoc)
    : resolveCurrentSprintDoc(repoRoot);

  const sprintDoc = parseSprintDoc(fs.readFileSync(sprintDocPath, 'utf8'));

  const token = process.env.GH_TOKEN || process.env.PROJECTS_TOKEN || process.env.GITHUB_TOKEN;

  // A missing/malformed sprint number is a structured audit failure
  // (`sprint-number-invalid`), not a crash — so `--json` / `--allow-fail` still
  // produce a report for the malformed-document case. Skip the sprint-dependent
  // fetch and let auditSprint surface the failure.
  if (sprintDoc.sprintNumber == null) {
    const result = auditSprint({
      sprintDoc,
      issues: [],
      activeIteration: null,
      today: opts.today,
      defaultRepo: `${opts.owner}/${opts.repo}`,
    });
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Source: ${path.relative(repoRoot, sprintDocPath)}`);
      console.log('');
      console.log(renderReport(result));
    }
    if (!result.ok && !opts.allowFail) {
      process.exitCode = 1;
    }
    return;
  }

  const { issues, activeIteration, missingRefs } = await fetchAuditData({
    owner: opts.owner,
    repo: opts.repo,
    projectNumber: opts.projectNumber,
    sprintNumber: sprintDoc.sprintNumber,
    scopeRefs: sprintDoc.scopeRefs,
    opportunisticRefs: sprintDoc.opportunisticRefs,
    sprintStarted: sprintDoc.started,
    token,
  });

  const result = auditSprint({
    sprintDoc,
    issues,
    activeIteration,
    today: opts.today,
    defaultRepo: `${opts.owner}/${opts.repo}`,
    missingRefs,
  });

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Source: ${path.relative(repoRoot, sprintDocPath)}`);
    console.log('');
    console.log(renderReport(result));
  }

  if (!result.ok && !opts.allowFail) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, resolveCurrentSprintDoc };
