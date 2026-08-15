'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePercent } = require('../calculate.js');

test('calculatePercent rounds done/total to the nearest percent', () => {
  assert.equal(calculatePercent({ done: 1, total: 3 }), 33);
  assert.equal(calculatePercent({ done: 2, total: 3 }), 67);
});

test('calculatePercent returns 100 when everything is done', () => {
  assert.equal(calculatePercent({ done: 5, total: 5 }), 100);
});

test('calculatePercent returns 0 when nothing is done', () => {
  assert.equal(calculatePercent({ done: 0, total: 5 }), 0);
});

test('calculatePercent returns 0 for an empty iteration without dividing by zero', () => {
  assert.equal(calculatePercent({ done: 0, total: 0 }), 0);
});
