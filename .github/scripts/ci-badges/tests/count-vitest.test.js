'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { countFiles } = require('../count-vitest.js');

test('countFiles sums numTotalTests/numPassedTests across shard reports', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-badges-vitest-'));
  const shard1 = path.join(dir, 'shard-1.json');
  const shard2 = path.join(dir, 'shard-2.json');
  fs.writeFileSync(shard1, JSON.stringify({ numTotalTests: 10, numPassedTests: 9 }));
  fs.writeFileSync(shard2, JSON.stringify({ numTotalTests: 5, numPassedTests: 5 }));

  const totals = countFiles([shard1, shard2]);
  assert.deepEqual(totals, { totalTests: 15, passedTests: 14 });

  fs.rmSync(dir, { recursive: true, force: true });
});

test('countFiles skips a missing path instead of throwing', () => {
  const totals = countFiles(['/does/not/exist.json']);
  assert.deepEqual(totals, { totalTests: 0, passedTests: 0 });
});

test('countFiles treats a missing field as zero', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-badges-vitest-'));
  const shard1 = path.join(dir, 'shard-1.json');
  fs.writeFileSync(shard1, JSON.stringify({}));

  const totals = countFiles([shard1]);
  assert.deepEqual(totals, { totalTests: 0, passedTests: 0 });

  fs.rmSync(dir, { recursive: true, force: true });
});
