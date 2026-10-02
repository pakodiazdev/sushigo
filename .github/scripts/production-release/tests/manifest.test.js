'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateManifest } = require('../manifest.js');

const SHA = '0123456789abcdef0123456789abcdef01234567';
const DIGEST = `sha256:${'f'.repeat(64)}`;
const good = {
  target: 'prod-cloudrun',
  commit: SHA,
  image_uri: 'us-central1-docker.pkg.dev/sushigo-app/sushigo/sushigo-api-prod:release-0123456789ab',
  digest: DIGEST,
};
const expected = { commit: SHA, target: 'prod-cloudrun', imageName: 'sushigo-api-prod' };

test('a well-formed manifest yields the immutable digest reference', () => {
  assert.deepEqual(validateManifest(good, expected), {
    ok: true,
    errors: [],
    imageRef: `us-central1-docker.pkg.dev/sushigo-app/sushigo/sushigo-api-prod@${DIGEST}`,
  });
});

test('rejects a manifest built for a different commit', () => {
  const r = validateManifest({ ...good, commit: 'f'.repeat(40) }, expected);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(), /commit/);
});

test('rejects the preview target — Production never falls back to it', () => {
  const r = validateManifest({ ...good, target: 'preview' }, expected);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(), /target/);
});

test('rejects a missing or malformed digest', () => {
  assert.equal(validateManifest({ ...good, digest: '' }, expected).ok, false);
  assert.equal(validateManifest({ ...good, digest: 'sha256:abc' }, expected).ok, false);
  assert.equal(validateManifest({ ...good, digest: `sha256:${'F'.repeat(64)}` }, expected).ok, false);
});

test('rejects an image that is not the expected Production image name', () => {
  const r = validateManifest(
    { ...good, image_uri: 'us-central1-docker.pkg.dev/sushigo-app/sushigo/sushigo-api-preview:release-0123456789ab' },
    expected,
  );
  assert.equal(r.ok, false);
  assert.match(r.errors.join(), /image/);
});

test('rejects an image URI that is already a digest or has no tag', () => {
  assert.equal(validateManifest({ ...good, image_uri: `x/sushigo-api-prod@${DIGEST}` }, expected).ok, false);
  assert.equal(validateManifest({ ...good, image_uri: 'x/sushigo-api-prod' }, expected).ok, false);
});

test('rejects a non-object manifest', () => {
  assert.equal(validateManifest(null, expected).ok, false);
});
