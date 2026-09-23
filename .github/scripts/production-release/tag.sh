#!/usr/bin/env bash
set -euo pipefail

# Moves or deletes one of Production's promotion-state tags (#636) through the GitHub API, so a
# workflow can update it with its own GITHUB_TOKEN (contents: write) — see guard.js for what each
# tag means. Tags are annotated, so the message (run URL, reason) travels with the state change.
#
# Usage:
#   tag.sh set    <tag> <commit-sha> <message>   create the tag, or force-move it if it exists
#   tag.sh delete <tag>                          remove the tag (no-op if it does not exist)
#
# Requires GH_TOKEN and GITHUB_REPOSITORY (both present in every GitHub Actions job).

ACTION="${1:-}"
TAG="${2:-}"

if [ -z "$ACTION" ] || [ -z "$TAG" ]; then
  echo "Usage: $0 set <tag> <commit-sha> <message> | $0 delete <tag>"
  exit 1
fi

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

case "$TAG" in
  deploy/production/watermark|deploy/production/quiesced) ;;
  *)
    echo "❌ Error: refusing to touch '${TAG}' — only Production promotion-state tags are managed here"
    exit 1
    ;;
esac

REPO_API="repos/${GITHUB_REPOSITORY}"

case "$ACTION" in
  set)
    SHA="${3:-}"
    MESSAGE="${4:-}"
    if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]] || [ -z "$MESSAGE" ]; then
      echo "❌ Error: set needs a full 40-character commit SHA and a message"
      exit 1
    fi
    TAG_OBJECT="$(gh api "${REPO_API}/git/tags" \
      -f tag="$TAG" -f message="$MESSAGE" -f object="$SHA" -f type=commit --jq .sha)"
    if gh api "${REPO_API}/git/ref/tags/${TAG}" --silent 2>/dev/null; then
      gh api -X PATCH "${REPO_API}/git/refs/tags/${TAG}" -f sha="$TAG_OBJECT" -F force=true --silent
    else
      gh api "${REPO_API}/git/refs" -f ref="refs/tags/${TAG}" -f sha="$TAG_OBJECT" --silent
    fi
    echo "✅ ${TAG} → ${SHA}"
    ;;
  delete)
    if gh api "${REPO_API}/git/ref/tags/${TAG}" --silent 2>/dev/null; then
      gh api -X DELETE "${REPO_API}/git/refs/tags/${TAG}" --silent
      echo "✅ ${TAG} deleted"
    else
      echo "✅ ${TAG} did not exist — nothing to delete"
    fi
    ;;
  *)
    echo "❌ Error: unknown action '${ACTION}' (expected set | delete)"
    exit 1
    ;;
esac
