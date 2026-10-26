# AGENTS.md — Development & Maintenance Rules for KyndForm

This repository is **KyndForm**, an independent standalone conversational, classic, and headless form platform.

Originally evolved from open-source HeyForm (base tag `v3.0.1`), KyndForm has been **fully detached into a self-contained application with zero upstream dependency**. All future features, layouts, API systems, themes, and security patches are developed and maintained natively within this codebase.

Any AI assistant or developer working on this codebase **MUST** strictly adhere to the following rules to maintain architectural stability and prevent functional regression.

---

## 1. Prime Directive: Protect Core Architecture & Features

KyndForm contains critical architectural, security, and functional capabilities added across 28+ custom commits beyond its open-source origin.

**NEVER overwrite, revert, or remove custom capabilities** during refactoring, package upgrades, or feature development.

Every agent must consult [docs/KYNDFORM_ARCHITECTURE_SPEC.md](file:///Users/waqas/Development/2026/kyndForms/docs/KYNDFORM_ARCHITECTURE_SPEC.md) before modifying files in overlapping domains.

---

## 2. Core Architectural Rules

### Rule 2.1: Modular Component & Service Architecture
- When adding new capabilities, isolate them in dedicated files, modules, or services (`packages/server`, `packages/webapp`, `packages/form-renderer`, `packages/answer-utils`) rather than polluting existing core utilities.
- Maintain clean, documented interfaces and TypeScript typing across packages.

### Rule 2.2: Single Root Lockfile Policy
- The entire monorepo uses a single, root-level `pnpm-lock.yaml`.
- **NEVER** run `pnpm install` inside a subpackage directory (`packages/server`, `packages/webapp`, etc.) without the workspace context.
- **NEVER** commit nested `pnpm-lock.yaml` files inside `packages/*`.

### Rule 2.3: Standalone Repository & No Upstream Dependency
The repository is maintained as an independent standalone codebase:
- `origin`: `https://github.com/thewaqasPro/KyndForms.git` (Primary KyndForm repository)

There is **no upstream repository or upstream sync workflow**. All features, maintenance, and bug fixes must be designed, implemented, and tested directly within this repository.

### Rule 2.4: Rebranding Integrity
- KyndForm is fully rebranded. **DO NOT** reintroduce HeyForm strings, logos, copyright notices, or domains (`heyform.com`) into KyndForm components, renderer templates, or views unless interfacing with legacy third-party webhooks explicitly requiring compatibility headers.

---

## 3. Protected Capabilities (Do Not Regress)

The following areas are custom-built for KyndForm and must remain intact:

1. **Headless Form Submission Engine**:
   - Location: `packages/server/src/controller/headless-form.controller.ts`
   - Features: Programmatic submission endpoints (`POST /f/:formId`, `POST /api/f/:formId`), auto-schema discovery, dynamic field creation, honeypot/captcha filtering, submission quota enforcement.
2. **Answer Utilities Package**:
   - Location: `packages/answer-utils/`
   - Role: Standalone parsing, sanitization, logic condition validation, and secure HTML formatting of form submissions.
3. **Dual Form Layout Engine**:
   - Location: `packages/form-renderer/src/views/` (Conversational & Classic)
   - Features: Step-by-step conversational flow with keyboard navigation, and continuous classic form layout with responsive grid choices.
4. **Project-Scoped Media Library & S3 Reuse**:
   - Location: `packages/server/src/controller/media.controller.ts`, `packages/webapp/src/components/MediaPicker.tsx`
   - Features: S3/MinIO and Unsplash upload pipeline with project/workspace asset indexing and instant cross-form reuse.
5. **Self-Hosted First-Party Embed Engine**:
   - Location: `packages/embed/scripts/copy-dist.js`, `/static/embed.js`, `/embed.js`
   - Features: Zero third-party unpkg dependencies; embed script is built and served directly from the KyndForm host.
6. **Syntax-Highlighted Developer Code Blocks**:
   - Location: `packages/webapp/src/components/CodeBlock.tsx`
   - Features: Dark IDE theme code previews with token highlighting for HTML, Next.js, Astro, and cURL with integrated copy action.
7. **Modern Inline Question Number Badges**:
   - Location: `packages/form-renderer/src/blocks/Block.tsx`
   - Features: Inline badges (`1`, `2`) with accessible `aria-label="Question 1 of 10"` replacing rigid "Question 1" text headers.
8. **Application Port & Docker Deploy Configuration**:
   - Default application port is `8000` (with backward-compatible support for `9157`).
   - Multi-stage Docker containerization using `pnpm --filter=./packages/server --prod deploy /app/prod-server`.
   - Health check probe at `/health/ready`.
9. **Modern SCSS Preprocessor & Theming**:
   - Vite configured with `api: 'modern-compiler'` for Sass in `packages/webapp/vite.config.mts` and `packages/form-renderer`.

---

## 4. Verification Protocol (Mandatory Before Turn Completion)

Before claiming any task, fix, or feature is complete, an agent **MUST execute and verify** all three commands:

```bash
# 1. Verify architectural integrity
pnpm run verify:integrity

# 2. Type check all packages in the workspace
pnpm run type-check

# 3. Run unit tests across utilities and answer-utils
pnpm test

# 4. Verify linting passes without errors
pnpm lint
```

Evidence of clean execution (exit code 0) must be observed in the tool output. Never assert that code is passing without running the verification commands.
