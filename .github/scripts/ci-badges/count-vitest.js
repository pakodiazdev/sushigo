'use strict';

// Sums Vitest's `--reporter=json` output (`numTotalTests`/`numPassedTests`, Jest-compatible
// shape) across every shard. `_webapp-ci.yml` runs 4 shards with
// `--outputFile.json=vitest-results-shard-N.json` alongside its existing `--reporter=blob` run
// (the keyed `--outputFile.json=` form, not a bare `--outputFile=`, keeps the two reporters'
// outputs from colliding on the same path).

const fs = require('node:fs');

function countFiles(paths) {
  let totalTests = 0;
  let passedTests = 0;

  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) continue;
    const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    totalTests += Number(report.numTotalTests || 0);
    passedTests += Number(report.numPassedTests || 0);
  }

  return { totalTests, passedTests };
}

function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    throw new Error('Usage: node count-vitest.js <json-report-path> [more-json-report...]');
  }

  const { totalTests, passedTests } = countFiles(paths);
  const lines = [`tests_total=${totalTests}`, `tests_passed=${passedTests}`];

  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${lines.join('\n')}\n`);
  }
  console.log(lines.join('\n'));
}

if (require.main === module) {
  main();
}

module.exports = { countFiles };
