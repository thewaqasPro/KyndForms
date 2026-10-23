#!/usr/bin/env bash
set -e

# ==============================================================================
# KyndForm Safe Upstream Sync Workflow
#
# Syncs updates from upstream (heyform/heyform) into the current branch (next)
# while guaranteeing all custom KyndForm enhancements are preserved.
# ==============================================================================

UPSTREAM_REMOTE="upstream"
UPSTREAM_URL="https://github.com/heyform/heyform.git"
TARGET_BRANCH="${1:-next}"

echo "==================================================================="
echo "🔄 KyndForm Upstream Sync Protocol"
echo "==================================================================="

# 1. Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Working tree contains uncommitted changes."
  echo "Please commit or stash your changes before syncing with upstream."
  git status --short
  exit 1
fi

# 2. Ensure upstream remote exists
if ! git remote get-url "$UPSTREAM_REMOTE" > /dev/null 2>&1; then
  echo "ℹ️  Adding upstream remote: $UPSTREAM_URL"
  git remote add "$UPSTREAM_REMOTE" "$UPSTREAM_URL"
fi

# 3. Create safety backup branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
BACKUP_BRANCH="backup/pre-sync-$(date +%Y%m%d_%H%M%S)"
echo "🛡️  Creating safety backup branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH"

# 4. Fetch upstream updates
echo "📥 Fetching latest commits from $UPSTREAM_REMOTE..."
git fetch "$UPSTREAM_REMOTE" --tags

# 5. Check if upstream branch exists
UPSTREAM_REF="$UPSTREAM_REMOTE/$TARGET_BRANCH"
if ! git rev-parse --verify "$UPSTREAM_REF" > /dev/null 2>&1; then
  echo "❌ Error: Upstream ref $UPSTREAM_REF does not exist."
  exit 1
fi

# 6. Show incoming commits
NEW_COMMITS=$(git rev-list --count HEAD.."$UPSTREAM_REF" 2>/dev/null || echo "0")
echo "ℹ️  Incoming upstream commits: $NEW_COMMITS"

if [ "$NEW_COMMITS" -eq 0 ]; then
  echo "✨ Your branch is already up-to-date with $UPSTREAM_REF! No sync needed."
  echo "Running fork integrity verification..."
  pnpm run verify:fork
  exit 0
fi

echo "📋 Latest incoming commits from upstream:"
git log --oneline -n 10 HEAD.."$UPSTREAM_REF"

# 7. Execute merge
echo ""
echo "🔀 Merging $UPSTREAM_REF into $CURRENT_BRANCH..."
if ! git merge "$UPSTREAM_REF" --no-edit; then
  echo ""
  echo "⚠️  MERGE CONFLICTS DETECTED!"
  echo "-------------------------------------------------------------------"
  echo "Please resolve conflicts manually using your editor or IDE."
  echo "CRITICAL: Consult docs/FORK_ENHANCEMENTS_REGISTRY.md to ensure"
  echo "none of our custom KyndForm enhancements are overwritten."
  echo ""
  echo "After resolving conflicts:"
  echo "  1. git add <resolved-files>"
  echo "  2. git commit"
  echo "  3. pnpm install"
  echo "  4. pnpm run verify:fork"
  echo "  5. pnpm type-check && pnpm test && pnpm build"
  echo "-------------------------------------------------------------------"
  echo "To abort and return to pre-sync state: git merge --abort"
  exit 1
fi

# 8. Post-merge dependency and build verification
echo ""
echo "📦 Updating root workspace dependencies..."
pnpm install

echo ""
echo "🔍 Running fork enhancement integrity checks..."
node scripts/verify-fork-integrity.js

echo ""
echo "🧪 Running type checking across all packages..."
pnpm type-check

echo ""
echo "🧪 Running test suites..."
pnpm test

echo ""
echo "🏗️  Running build verification..."
pnpm build

echo ""
echo "==================================================================="
echo "🎉 SUCCESS: Upstream sync completed cleanly!"
echo "All custom fork enhancements verified and intact."
echo "Backup branch preserved at: $BACKUP_BRANCH"
echo "==================================================================="
