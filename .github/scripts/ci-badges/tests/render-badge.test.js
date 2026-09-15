'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderStatusBadge } = require('../render-badge.js');

test('renderStatusBadge escapes XML-sensitive characters in label and message', () => {
  const svg = renderStatusBadge({ label: 'a & b', message: '<x>', status: 'success' });
  assert.ok(svg.includes('a &amp; b'));
  assert.ok(svg.includes('&lt;x&gt;'));
  assert.ok(!svg.includes('<x>'));
});

test('renderStatusBadge picks the success color for a success status', () => {
  const svg = renderStatusBadge({ label: 'tests', message: '10 tests', status: 'success' });
  assert.ok(svg.includes('#2da44e'));
});

test('renderStatusBadge picks the failure color for a failure status', () => {
  const svg = renderStatusBadge({ label: 'tests', message: '10 tests', status: 'failure' });
  assert.ok(svg.includes('#cf222e'));
});

test('renderStatusBadge falls back to the unknown color for an unrecognized status', () => {
  const svg = renderStatusBadge({ label: 'tests', message: '10 tests', status: 'weird' });
  assert.ok(svg.includes('#8b949e'));
});

test('renderStatusBadge produces valid, self-contained SVG markup', () => {
  const svg = renderStatusBadge({ label: 'lint', message: 'passing', status: 'success' });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('role="img"'));
});
