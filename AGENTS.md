# AGENTS.md — Development & Maintenance Rules for KyndForm

This repository is a downstream fork of [heyform/heyform](https://github.com/heyform/heyform), enhanced and branded as **KyndForm**.

Any AI assistant or developer working on this codebase **MUST** strictly adhere to the following rules to prevent regression, maintain upstream compatibility, and protect custom enhancements.

---

## 1. Prime Directive: Protect Custom Enhancements

KyndForm contains critical architectural, security, and functional enhancements added across 24+ custom commits ahead of upstream HeyForm (from tag `v3.0.1`).

**NEVER overwrite, revert, or remove custom enhancements** during upstream merges, rebases, refactors, or feature development.

Every agent must consult [docs/FORK_ENHANCEMENTS_REGISTRY.md](file:///Users/waqas/Development/2026/kyndForms/docs/FORK_ENHANCEMENTS_REGISTRY.md) before modifying files in overlapping domains.

---

## 2. Core Architectural & Fork Rules

### Rule 2.1: The Extension-Over-Modification Pattern
- When adding new capabilities, **isolate them in dedicated files, modules, or services** rather than modifying upstream core files directly.
- If an upstream file *must* be modified, clearly mark the custom logic with boundary comments:
  ```typescript
  // --- [KYNDFORM ENHANCEMENT START] ---
  // Description: Custom logic for headless auto-schema creation
  // ...
  // --- [KYNDFORM ENHANCEMENT END] ---
  ```

### Rule 2.2: Single Root Lockfile Policy
- The entire monorepo uses a single, root-level `pnpm-lock.yaml`.
- **NEVER** run `pnpm install` inside a subpackage directory (`packages/server`, `packages/webapp`, etc.) without the workspace context.
- **NEVER** commit nested `pnpm-lock.yaml` files inside `packages/*`.

### Rule 2.3: Upstream Git Remote Configuration
The local git configuration maintains two remotes:
- `origin`: `https://github.com/thewaqasPro/heyform.git` (Downstream KyndForm fork)
- `upstream`: `https://github.com/heyform/heyform.git` (Official HeyForm repository)

When syncing upstream changes:
1. Always fetch from `upstream` (`git fetch upstream`).
2. Never perform blind fast-forwards or automatic merges without reviewing `git diff` against the [Fork Enhancements Registry](file:///Users/waqas/Development/2026/kyndForms/docs/FORK_ENHANCEMENTS_REGISTRY.md).
3. If conflicts arise, preserve **BOTH** the upstream bugfix/feature AND the KyndForm enhancement.

### Rule 2.4: Rebranding Integrity
- KyndForm is fully rebranded. **DO NOT** reintroduce HeyForm strings, logos, copyright notices, or domains (`heyform.com`) into KyndForm components, renderer templates, or views unless interfacing with legacy third-party webhooks explicitly requiring compatibility headers.

---

## 3. Protected Enhancements (Do Not Regress)

The following areas are custom-built for KyndForm and must remain intact:

1. **Headless Form Submission Engine**:
   - Location: `packages/server/src/controller/headless-form.controller.ts`
   - Features: Programmatic submission endpoints (`/f/:formId`, `/api/f/:formId`), auto-schema discovery, dynamic field creation, honeypot/captcha filtering, submission quota enforcement.
2. **Answer Utilities Package**:
   - Location: `packages/answer-utils/`
   - Role: Standalone parsing, sanitization, logic condition validation, and HTML formatting of form submissions.
3. **Webapp Headless & JSON Import Features**:
   - `packages/webapp/src/pages/form/Share/HeadlessModal.tsx`: Headless API endpoint documentation and integration snippet modal.
   - `packages/webapp/src/layouts/Workspace/TemplatesModel.tsx`: JSON template file upload.
   - `packages/webapp/src/services/form.ts`: `FormService.importFromJSON` method.
   - `packages/webapp/src/services/app.ts`: `AppService.detail` and `AppService.authorizationCode`.
4. **Application Port & Docker Deploy Configuration**:
   - Default application port is `8000` (with backward-compatible support for `9157`).
   - Multi-stage Docker containerization using `pnpm --filter=./packages/server --prod deploy /app/prod-server`.
5. **Modern SCSS Preprocessor & Theming**:
   - Vite configured with `api: 'modern-compiler'` for Sass in `packages/webapp/vite.config.mts` and `packages/form-renderer`.

---

## 4. Verification Protocol (Mandatory Before Turn Completion)

Before claiming any task, fix, or feature is complete, an agent **MUST execute and verify** all three commands:

```bash
# 1. Type check all packages in the workspace
pnpm type-check

# 2. Run unit tests across utilities and answer-utils
pnpm test

# 3. Verify linting passes without errors
pnpm lint
```

Evidence of clean execution (exit code 0) must be observed in the tool output. Never assert that code is passing without running the verification commands.
