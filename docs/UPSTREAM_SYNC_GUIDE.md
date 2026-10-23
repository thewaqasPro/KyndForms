# KyndForm Upstream Synchronization & Fork Preservation Guide

> **Objective:** Maintain full synchronization with upstream **HeyForm** (`https://github.com/heyform/heyform`) while guaranteeing 100% preservation of KyndForm custom features, branding, architecture, and bug fixes.

---

## 1. Fork Architecture Overview

KyndForm is a downstream enhancement layer built on top of HeyForm.

| Layer | Upstream HeyForm | KyndForm Fork |
| :--- | :--- | :--- |
| **Active Branch** | `next` | `next` |
| **Package Scope** | `@heyform/*` / `@heyform-inc/*` | `@kyndform/*` |
| **New Packages** | None | `@kyndform/answer-utils` |
| **Headless Form API** | Not available | `POST /f/:formId`, `POST /api/f/:formId` |
| **Form JSON Import** | Not available | `FormService.importFromJSON(...)` |
| **OAuth Helpers** | Not available | `AppService.detail`, `AppService.authorizationCode` |
| **Lockfile Policy** | Multiple/Nested | Single consolidated root `pnpm-lock.yaml` |

---

## 2. Automated Safety Mechanisms

We have implemented three automated guardrails to prevent accidental regression:

### A. Pre-Sync Safety Snapshots
Whenever you execute `pnpm run sync:upstream`, the script automatically creates a timestamped local backup branch:
```bash
backup/pre-sync-YYYYMMDD_HHMMSS
```
If anything goes wrong during a merge, you can revert instantly with:
```bash
git merge --abort
# or reset to your backup
git reset --hard backup/pre-sync-YYYYMMDD_HHMMSS
```

### B. Automated Fork Integrity Check
Run at any time:
```bash
pnpm run verify:fork
```
This script programmatically inspects 13 critical areas of the codebase:
1. Verifies that **no nested lockfiles** exist in sub-packages (enforcing single root lockfile policy).
2. Verifies `@kyndform/answer-utils` is present and linked.
3. Verifies `HeadlessFormController` exists in `packages/server/src/controller/`.
4. Verifies `headless-form.controller` is exported in `packages/server/src/controller/index.ts`.
5. Verifies `form-submitted.html` template is present.
6. Verifies SSRF outbound URL hardening utility exists.
7. Verifies `FormService.importFromJSON` is present in webapp.
8. Verifies JSON schema file upload in `TemplatesModel.tsx` is present.
9. Verifies `AppService.detail` and `authorizationCode` are present.
10. Verifies `HeadlessModal.tsx` exists and is mounted in Form Share.
11. Verifies `AGENTS.md` rules exist.
12. Verifies `docs/FORK_ENHANCEMENTS_REGISTRY.md` exists.
13. Exits with non-zero code if any custom feature is missing or damaged.

---

## 3. Step-by-Step Upstream Sync Protocol

### Step 1: Ensure Clean Working Tree
Before syncing, ensure your current branch is committed:
```bash
git status
```

### Step 2: Run the Sync Command
To sync from `upstream/next`:
```bash
pnpm run sync:upstream
```
*(Or specify a tag/branch, e.g. `bash scripts/sync-upstream.sh v3.0.2`)*

### Step 3: Resolving Conflicts (If Any Occur)

If upstream has changed the same lines as our fork enhancements:

1. **Package Imports & Renames**:
   - If upstream adds imports from `@heyform/utils` or `@heyform-inc/utils`, adjust them to `@kyndform/utils`.
   - Never revert `@kyndform/*` packages back to upstream names.
2. **Lockfiles**:
   - If `pnpm-lock.yaml` has conflicts, accept the upstream dependencies, then run `pnpm install` at the repository root. Never allow nested `packages/*/pnpm-lock.yaml` files.
3. **Controllers (`packages/server/src/controller/index.ts`)**:
   - Keep any new upstream controllers, and ensure `export * from './headless-form.controller'` remains.
4. **Services (`packages/webapp/src/services/form.ts` and `app.ts`)**:
   - Keep any new upstream query/mutation methods, and ensure `FormService.importFromJSON` and `AppService` methods remain intact.
5. **Share Screen (`packages/webapp/src/pages/form/Share/index.tsx`)**:
   - Ensure the `<HeadlessModal />` button remains mounted.

### Step 4: Validate the Merge

Once conflicts are staged (`git add .` and `git commit`):
```bash
# 1. Update dependencies
pnpm install

# 2. Verify custom fork features
pnpm run verify:fork

# 3. Check types across all workspace packages
pnpm run type-check

# 4. Run test suite
pnpm run test

# 5. Build all packages
pnpm run build
```

When all five commands succeed, push your synced branch to your GitHub fork:
```bash
git push origin next
```
