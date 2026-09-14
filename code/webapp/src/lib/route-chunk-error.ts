/**
 * Detect a failed dynamic `import()` for a lazy route chunk (#577).
 *
 * The message text differs by browser/bundler ("Failed to fetch dynamically imported
 * module", "error loading dynamically imported module", "Importing a module script
 * failed") but the cause is always the same: the chunk hash the client has in memory
 * no longer exists on the server, almost always because a new version was deployed.
 * Re-running the same import (a plain `reset()`) fails again for the same reason — the
 * client needs a full reload to pick up the new asset manifest.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  return /dynamically imported module|importing a module script failed|loading chunk/i.test(
    error.message
  )
}
