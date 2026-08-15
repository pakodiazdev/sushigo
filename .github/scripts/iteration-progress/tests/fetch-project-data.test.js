'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchProjectData } = require('../fetch-project-data.js');

const ITERATIONS = [{ id: 'active', title: 'Sprint 2', startDate: '2026-08-09', duration: 14 }];

function jsonResponse(body, { ok = true, status = 200, statusText = 'OK' } = {}) {
  return { ok, status, statusText, json: async () => body };
}

function projectPayload({ items, hasNextPage = false, endCursor = null }) {
  return {
    data: {
      user: {
        projectV2: {
          statusField: { id: 'status-field-id', name: 'Status' },
          iterationField: { id: 'iteration-field-id', name: 'Iteration', configuration: { iterations: ITERATIONS } },
          items: { pageInfo: { hasNextPage, endCursor }, nodes: items },
        },
      },
    },
  };
}

function withStubbedFetch(responses, run) {
  const originalFetch = global.fetch;
  const calls = [];
  let index = 0;
  global.fetch = async (url, options) => {
    calls.push(JSON.parse(options.body));
    const response = responses[index];
    index += 1;
    return response;
  };
  return run(calls).finally(() => {
    global.fetch = originalFetch;
  });
}

test('fetchProjectData maps a single page of items and iterations', async () => {
  const payload = projectPayload({
    items: [
      { status: { name: 'Done' }, iteration: { iterationId: 'active' } },
      { status: null, iteration: null },
    ],
  });

  await withStubbedFetch([jsonResponse(payload)], async () => {
    const result = await fetchProjectData({ owner: 'pakodiazdev', number: 7, token: 't' });
    assert.deepEqual(result.iterations, ITERATIONS);
    assert.deepEqual(result.items, [
      { status: 'Done', iterationId: 'active' },
      { status: null, iterationId: null },
    ]);
  });
});

test('fetchProjectData follows pagination, threading the cursor between requests', async () => {
  const page1 = projectPayload({
    items: [{ status: { name: 'Todo' }, iteration: { iterationId: 'active' } }],
    hasNextPage: true,
    endCursor: 'cursor-1',
  });
  const page2 = projectPayload({
    items: [{ status: { name: 'Done' }, iteration: { iterationId: 'active' } }],
    hasNextPage: false,
  });

  await withStubbedFetch([jsonResponse(page1), jsonResponse(page2)], async (calls) => {
    const result = await fetchProjectData({ owner: 'pakodiazdev', number: 7, token: 't' });
    assert.equal(result.items.length, 2);
    assert.equal(calls[0].variables.itemsCursor, null);
    assert.equal(calls[1].variables.itemsCursor, 'cursor-1');
  });
});

test('fetchProjectData throws when the HTTP response is not ok', async () => {
  await withStubbedFetch([jsonResponse({}, { ok: false, status: 502, statusText: 'Bad Gateway' })], async () => {
    await assert.rejects(
      fetchProjectData({ owner: 'pakodiazdev', number: 7, token: 't' }),
      /GitHub GraphQL request failed: 502 Bad Gateway/,
    );
  });
});

test('fetchProjectData throws when the GraphQL response contains errors', async () => {
  const payload = { errors: [{ message: 'rate limited' }, { message: 'try again later' }] };
  await withStubbedFetch([jsonResponse(payload)], async () => {
    await assert.rejects(
      fetchProjectData({ owner: 'pakodiazdev', number: 7, token: 't' }),
      /rate limited; try again later/,
    );
  });
});

test('fetchProjectData throws a clear error when the project is not found', async () => {
  const payload = { data: { user: { projectV2: null } } };
  await withStubbedFetch([jsonResponse(payload)], async () => {
    await assert.rejects(
      fetchProjectData({ owner: 'pakodiazdev', number: 7, token: 't' }),
      /Project #7 not found for owner "pakodiazdev"/,
    );
  });
});

test('fetchProjectData throws a clear error when the Status field is missing', async () => {
  const payload = projectPayload({ items: [] });
  delete payload.data.user.projectV2.statusField;
  await withStubbedFetch([jsonResponse(payload)], async () => {
    await assert.rejects(
      fetchProjectData({ owner: 'pakodiazdev', number: 7, token: 't' }),
      /missing the required "Status" field/,
    );
  });
});

test('fetchProjectData throws a clear error when the Iteration field is missing', async () => {
  const payload = projectPayload({ items: [] });
  delete payload.data.user.projectV2.iterationField;
  await withStubbedFetch([jsonResponse(payload)], async () => {
    await assert.rejects(
      fetchProjectData({ owner: 'pakodiazdev', number: 7, token: 't' }),
      /missing the required "Iteration" field/,
    );
  });
});
