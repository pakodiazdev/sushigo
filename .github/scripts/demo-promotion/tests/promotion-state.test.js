'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readStateObject, StateReadError } = require('../promotion-state.js');

const json = (status, body) => new Response(JSON.stringify(body), { status });
const noSuchObject = () => json(404, { error: { code: 404, message: 'No such object: sushigo-demo-promotion-state/paused' } });

// Answers each request with the next queued response (or throws it, for a network failure).
const fakeFetch = (...responses) => {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next() : next;
  };
  return { impl, calls };
};

const read = (fetchImpl, object = 'paused') =>
  readStateObject({ bucket: 'sushigo-demo-promotion-state', object, token: 't', fetchImpl, sleep: async () => {} });

test('a confirmed "No such object" 404 is absent', async () => {
  const { impl } = fakeFetch(noSuchObject());
  assert.deepEqual(await read(impl), { present: false });
});

test('a present object returns its generation and the contents of that generation', async () => {
  const { impl, calls } = fakeFetch(json(200, { generation: '1761350000000000' }), new Response('abc123\n'));
  assert.deepEqual(await read(impl, 'watermark'), { present: true, generation: '1761350000000000', body: 'abc123\n' });
  assert.match(calls[1], /\/o\/watermark\?alt=media&generation=1761350000000000$/);
});

test('a permissions error aborts instead of reading as absent', async () => {
  const { impl } = fakeFetch(json(403, { error: { code: 403, message: 'deployer does not have storage.objects.get access' } }));
  await assert.rejects(read(impl), (error) => error instanceof StateReadError && /HTTP 403.*refusing to treat it as absent/.test(error.message));
});

test('a missing bucket is an error, not an absent object', async () => {
  const { impl } = fakeFetch(json(404, { error: { code: 404, message: 'The specified bucket does not exist.' } }));
  await assert.rejects(read(impl), /HTTP 404/);
});

test('a 404 without a GCS error body is an error', async () => {
  const { impl } = fakeFetch(new Response('<html>Not Found</html>', { status: 404 }));
  await assert.rejects(read(impl), /HTTP 404/);
});

test('retries transient failures, then reads normally', async () => {
  const { impl, calls } = fakeFetch(new TypeError('fetch failed'), json(503, {}), noSuchObject());
  assert.deepEqual(await read(impl), { present: false });
  assert.equal(calls.length, 3);
});

test('aborts once every retry of a network failure is exhausted', async () => {
  const { impl } = fakeFetch(new TypeError('fetch failed'), new TypeError('fetch failed'), new TypeError('fetch failed'));
  await assert.rejects(read(impl), (error) => error instanceof StateReadError && /network error: fetch failed/.test(error.message));
});

test('aborts when the object changes between describing and reading it', async () => {
  const { impl } = fakeFetch(json(200, { generation: '1' }), new Response('', { status: 404 }));
  await assert.rejects(read(impl, 'watermark'), /contents \(HTTP 404\)/);
});
