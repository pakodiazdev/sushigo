'use strict';

// Reads one of Demo's promotion-state objects (`watermark`, `paused`) from gs://$STATE_BUCKET and
// answers exactly: absent only on a confirmed "No such object" 404, present with its generation and
// contents on a 200, and an error for everything else — a 403, a missing bucket, a network failure.
// `gcloud storage objects describe` exits non-zero for all of those alike, which let a permissions
// error read as "not paused, no watermark" and skip the destructive-migration guard (#635).
//
// CLI: node promotion-state.js <object>   →  {"present":false}
//                                          or {"present":true,"generation":"…","body":"…"}

const { execFileSync } = require('node:child_process');

const API = 'https://storage.googleapis.com/storage/v1';
const ATTEMPTS = 3;

class StateReadError extends Error {}

const isTransient = (status) => status === 429 || status >= 500;

async function request(fetchImpl, url, token, sleep) {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!isTransient(response.status)) return response;
      lastError = new StateReadError(`HTTP ${response.status}`);
    } catch (error) {
      lastError = new StateReadError(`network error: ${error.message}`);
    }
    if (attempt < ATTEMPTS) await sleep(attempt * 1000);
  }
  throw lastError;
}

async function isMissingObject(response) {
  if (response.status !== 404) return false;
  const text = await response.text();
  try {
    return /no such object/i.test(JSON.parse(text).error?.message ?? '');
  } catch {
    return false;
  }
}

async function readStateObject({
  bucket,
  object,
  token,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const where = `gs://${bucket}/${object}`;
  const metadataUrl = `${API}/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object)}`;

  let metadata;
  try {
    metadata = await request(fetchImpl, metadataUrl, token, sleep);
  } catch (error) {
    throw new StateReadError(`Could not read ${where} (${error.message}) — refusing to treat it as absent`);
  }
  if (await isMissingObject(metadata)) return { present: false };
  if (metadata.status !== 200) {
    throw new StateReadError(`Could not read ${where} (HTTP ${metadata.status}) — refusing to treat it as absent`);
  }
  const { generation } = await metadata.json();

  // Pin the contents to the generation just described, so body and generation always belong together.
  const media = await request(fetchImpl, `${metadataUrl}?alt=media&generation=${generation}`, token, sleep)
    .catch((error) => { throw new StateReadError(`Could not read ${where} contents (${error.message})`); });
  if (media.status !== 200) {
    throw new StateReadError(`Could not read ${where} contents (HTTP ${media.status}) — it changed or is unreadable`);
  }
  return { present: true, generation: String(generation), body: await media.text() };
}

async function main() {
  const object = process.argv[2];
  const bucket = process.env.STATE_BUCKET;
  if (!object || !bucket) {
    console.error('Usage: STATE_BUCKET=<bucket> node promotion-state.js <object>');
    process.exit(64);
  }
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  try {
    process.stdout.write(`${JSON.stringify(await readStateObject({ bucket, object, token }))}\n`);
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = { readStateObject, StateReadError };
