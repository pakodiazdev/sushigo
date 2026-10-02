'use strict';

// Validates the release manifest `_release-build.yml` publishes as the `release-<target>` artifact
// (#633 → #636). Production consumes exactly the digest resolved once by the build job — it never
// rebuilds, never re-resolves the mutable `release-<sha>` tag, and never accepts the `preview`
// target. Returns the `<repository>@sha256:<digest>` reference the deploy must use.
//
// Usage: node manifest.js <release.json> <expected-commit> <expected-image-name>
// Writes image_ref=<ref> to $GITHUB_OUTPUT; exits 1 listing every problem otherwise.

const fs = require('node:fs');

const TARGET = 'prod-cloudrun';

function validateManifest(manifest, { commit, target = TARGET, imageName }) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') {
    return { ok: false, errors: ['manifest is not a JSON object'], imageRef: null };
  }
  if (manifest.target !== target) {
    errors.push(`target is '${manifest.target}', expected '${target}'`);
  }
  if (manifest.commit !== commit) {
    errors.push(`commit is '${manifest.commit}', expected the triggering commit '${commit}'`);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(manifest.digest || '')) {
    errors.push(`digest '${manifest.digest}' is not a sha256 digest`);
  }
  const uri = String(manifest.image_uri || '');
  const m = /^(.+\/([a-z0-9._-]+)):([A-Za-z0-9._-]+)$/.exec(uri);
  if (!m || uri.includes('@')) {
    errors.push(`image_uri '${uri}' is not a tagged Artifact Registry image`);
  } else if (m[2] !== imageName) {
    errors.push(`image '${m[2]}' is not the Production image '${imageName}'`);
  }
  const ok = errors.length === 0;
  return { ok, errors, imageRef: ok ? `${m[1]}@${manifest.digest}` : null };
}

function main() {
  const [file, commit, imageName] = process.argv.slice(2);
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.log(`::error title=Release manifest::cannot read ${file}: ${e.message}`);
    process.exit(1);
  }
  const r = validateManifest(manifest, { commit, imageName });
  if (!r.ok) {
    r.errors.forEach((e) => console.log(`::error title=Release manifest::${e}`));
    process.exit(1);
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `image_ref=${r.imageRef}\n`);
  }
  console.log(`✅ Release manifest valid — ${r.imageRef}`);
}

if (require.main === module) {
  main();
}

module.exports = { validateManifest };
