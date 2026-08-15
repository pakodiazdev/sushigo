'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pickActiveIteration, normalizeProjectData } = require('../normalize.js');

const ITERATIONS = [
  { id: 'prev', title: 'Sprint 1', startDate: '2026-07-26', duration: 14 },
  { id: 'active', title: 'Sprint 2', startDate: '2026-08-09', duration: 14 },
  { id: 'next', title: 'Sprint 3', startDate: '2026-08-23', duration: 14 },
];

test('pickActiveIteration returns the iteration whose window contains the reference date', () => {
  const result = pickActiveIteration(ITERATIONS, '2026-08-15');
  assert.equal(result.id, 'active');
});

test('pickActiveIteration treats the window as [startDate, startDate + duration)', () => {
  assert.equal(pickActiveIteration(ITERATIONS, '2026-08-09').id, 'active');
  assert.equal(pickActiveIteration(ITERATIONS, '2026-08-22').id, 'active');
  assert.equal(pickActiveIteration(ITERATIONS, '2026-08-23').id, 'next');
});

test('pickActiveIteration returns null when no iteration covers the reference date', () => {
  const result = pickActiveIteration(ITERATIONS, '2026-12-01');
  assert.equal(result, null);
});

test('pickActiveIteration returns null for an empty iteration list', () => {
  assert.equal(pickActiveIteration([], '2026-08-15'), null);
});

test('pickActiveIteration accepts a Date reference and stays consistent across repeated calls', () => {
  // iteration.startDate as a Date instance (not a string) used to be returned
  // as-is by parseDateOnly, so iterationBoundaryDate's setUTCDate() call mutated
  // that same object in place — corrupting iteration.startDate on every call.
  const iterations = [
    { id: 'active', title: 'Sprint X', startDate: new Date('2026-08-09T00:00:00Z'), duration: 14 },
  ];

  pickActiveIteration(iterations, '2026-08-15');
  pickActiveIteration(iterations, '2026-08-15');

  assert.equal(iterations[0].startDate.toISOString(), '2026-08-09T00:00:00.000Z');
  assert.equal(pickActiveIteration(iterations, '2026-08-15').id, 'active');
});

test('normalizeProjectData: iteration with a healthy mix of tasks', () => {
  const items = [
    { status: 'Done', iterationId: 'active' },
    { status: 'Done', iterationId: 'active' },
    { status: 'In Progress', iterationId: 'active' },
    { status: 'Todo', iterationId: 'active' },
    { status: 'Todo', iterationId: 'other-iteration-ignored' },
  ];
  const result = normalizeProjectData(
    { iterations: ITERATIONS, items },
    '2026-08-15',
  );

  assert.equal(result.hasActiveIteration, true);
  assert.equal(result.iteration.title, 'Sprint 2');
  assert.equal(result.iteration.startDate, '2026-08-09');
  // startDate + duration (2026-08-23) is the exclusive matching boundary and
  // also Sprint 3's own startDate — the displayed endDate must be the day
  // before that, not the boundary itself, or the range overlaps the next
  // sprint and reads as one day longer than it really is.
  assert.equal(result.iteration.endDate, '2026-08-22');
  assert.equal(result.done, 2);
  assert.equal(result.inProgress, 1);
  assert.equal(result.todo, 1);
  assert.equal(result.unexpectedCount, 0);
  assert.equal(result.total, 4);
});

test('normalizeProjectData: empty iteration has zero counts, no crash', () => {
  const result = normalizeProjectData(
    { iterations: ITERATIONS, items: [] },
    '2026-08-15',
  );

  assert.equal(result.hasActiveIteration, true);
  assert.equal(result.done, 0);
  assert.equal(result.inProgress, 0);
  assert.equal(result.todo, 0);
  assert.equal(result.total, 0);
});

test('normalizeProjectData: 100% complete iteration', () => {
  const items = [
    { status: 'Done', iterationId: 'active' },
    { status: 'Done', iterationId: 'active' },
    { status: 'Done', iterationId: 'active' },
  ];
  const result = normalizeProjectData({ iterations: ITERATIONS, items }, '2026-08-15');

  assert.equal(result.done, 3);
  assert.equal(result.total, 3);
});

test('normalizeProjectData: 0% complete iteration', () => {
  const items = [
    { status: 'Todo', iterationId: 'active' },
    { status: 'In Progress', iterationId: 'active' },
  ];
  const result = normalizeProjectData({ iterations: ITERATIONS, items }, '2026-08-15');

  assert.equal(result.done, 0);
  assert.equal(result.total, 2);
});

test('normalizeProjectData: unexpected status values are counted separately, not folded into known buckets', () => {
  const items = [
    { status: 'Done', iterationId: 'active' },
    { status: 'Blocked', iterationId: 'active' },
    { status: null, iterationId: 'active' },
  ];
  const result = normalizeProjectData({ iterations: ITERATIONS, items }, '2026-08-15');

  assert.equal(result.done, 1);
  assert.equal(result.inProgress, 0);
  assert.equal(result.todo, 0);
  assert.equal(result.unexpectedCount, 2);
  assert.deepEqual(result.unexpectedStatuses.sort(), ['Blocked', 'null']);
  assert.equal(result.total, 3);
});

test('normalizeProjectData: no active iteration is reported explicitly', () => {
  const result = normalizeProjectData(
    { iterations: ITERATIONS, items: [] },
    '2026-12-01',
  );

  assert.equal(result.hasActiveIteration, false);
});
