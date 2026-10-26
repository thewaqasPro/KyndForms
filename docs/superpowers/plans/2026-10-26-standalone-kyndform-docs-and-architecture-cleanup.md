# Standalone KyndForm Documentation & Architecture Cleanup Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This plan details the transition of KyndForm from a downstream fork to a **100% independent standalone application**. It updates all `README.md` and documentation files, highlights KyndForm's unique capabilities (headless form API engine, classic & conversational layouts, project-scoped media library, modern inline badges, Dokploy deployment), documents its open-source origin (originally built upon HeyForm v3.0.1, now completely independent with no upstream sync), and removes obsolete upstream scripts.

---

## 1. File Structure & Responsibilities

| File | Responsibility | Action |
| :--- | :--- | :--- |
| `README.md` | Primary project overview, standalone positioning, features, quick start, API & deployment docs | **Major Rewrite** |
| `AGENTS.md` | Core development rules, instructions for AI agents working in this repository | **Update** to declare standalone repository rules (Rule 1 & Rule 2.3) |
| `packages/server/resources/email-templates/README.md` | Documentation for MJML email templates | **Update** to ensure KyndForm branding |
| `docs/FORK_ENHANCEMENTS_REGISTRY.md` -> `docs/KYNDFORM_ARCHITECTURE_SPEC.md` | Permanent architectural specification of all KyndForm core features | **Rename & Update** |
| `docs/UPSTREAM_SYNC_GUIDE.md` -> `docs/STANDALONE_ARCHITECTURE_GUIDE.md` | Guide on standalone architecture, package structure, and release workflow | **Rewrite** |
| `docs/KYNDFORM_ADDITIONS_AND_FILE_TREE.md` | Full file tree and custom enhancement breakdown | **Update** with standalone links |
| `docs/DOKPLOY_LAUNCH_PLAN.md` | Production deployment guide | **Update** repository URL to `thewaqasPro/KyndForms` |
| `scripts/sync-upstream.sh` | Obsolete upstream sync script | **Remove** |
| `scripts/verify-fork-integrity.js` -> `scripts/verify-integrity.js` | Architecture & feature integrity check | **Rename & Update** |
| `package.json` | Root scripts: remove `sync:upstream`, update `verify:integrity` | **Update** |

---

## 2. Tasks Decomposition

### Task 1: Update Root `package.json` and Integrity Verification Script

**Files:**
- Modify: `package.json`
- Rename & Modify: `scripts/verify-fork-integrity.js` -> `scripts/verify-integrity.js`
- Delete: `scripts/sync-upstream.sh`

**Steps:**
- [ ] Rename `scripts/verify-fork-integrity.js` to `scripts/verify-integrity.js`.
- [ ] Update title and console logs in `scripts/verify-integrity.js` to "KyndForm Architecture Integrity Verification".
- [ ] In `package.json`, replace `"verify:fork": "node scripts/verify-fork-integrity.js"` with `"verify:integrity": "node scripts/verify-integrity.js"`.
- [ ] Remove `"sync:upstream": "bash scripts/sync-upstream.sh"` from `package.json`.
- [ ] Remove obsolete `scripts/sync-upstream.sh`.
- [ ] Run `pnpm run verify:integrity` and confirm exit code 0.

---

### Task 2: Rewrite Root `README.md`

**Files:**
- Modify: `README.md`

**Content Requirements:**
- **Tagline**: "Next-generation open-source conversational, classic, and headless form platform."
- **Standalone Identity & Provenance**: Clearly state that KyndForm was originally based on open-source HeyForm (v3.0.1) and has since been completely detached and rebuilt into an independent standalone application with no upstream dependency.
- **Key Capabilities Breakdown**:
  1. **Dual Form Layout Engine**: Conversational (single-question interactive flow) and Classic (continuous standard form layout).
  2. **Headless Form API & Dynamic Schema Discovery**: Direct submission via `POST /f/:formId` or `POST /api/f/:formId` for Next.js, Astro, static HTML, and mobile apps with automatic field creation and query parameter tracking.
  3. **Project-Scoped Media Library & S3 Reuse**: Upload images once to S3 or search Unsplash; reuse across all forms in the project.
  4. **Self-Hosted First-Party Embeds**: Embed scripts served directly from `/static/embed.js` (and `/embed.js`) without external third-party CDN dependencies.
  5. **Modern Inline Number Badges**: Clean inline badges (`1`, `2`) with accessible `aria-label="Question 1 of 10"`.
  6. **Enterprise Security & SSRF Protection**: Outbound private network firewall, honeypot traps, and reCAPTCHA integration.
  7. **Production Deployment with Dokploy & Docker**: Single-port (`8000`) multi-stage Docker container with `/health/ready` probe.
- **Repository URLs**: Update all clone commands to `https://github.com/thewaqasPro/KyndForms.git`.
- **License**: Reiterate open-source **AGPL-3.0** license.

**Steps:**
- [ ] Rewrite `README.md` incorporating the comprehensive standalone documentation.
- [ ] Verify markdown formatting, code block syntax, and relative file links.

---

### Task 3: Update `AGENTS.md` and Architecture Documentation

**Files:**
- Modify: `AGENTS.md`
- Rename & Modify: `docs/FORK_ENHANCEMENTS_REGISTRY.md` -> `docs/KYNDFORM_ARCHITECTURE_SPEC.md`
- Rename & Modify: `docs/UPSTREAM_SYNC_GUIDE.md` -> `docs/STANDALONE_ARCHITECTURE_GUIDE.md`
- Modify: `docs/KYNDFORM_ADDITIONS_AND_FILE_TREE.md`
- Modify: `docs/DOKPLOY_LAUNCH_PLAN.md`

**Steps:**
- [ ] In `AGENTS.md`:
  - Update Rule 1: Declare KyndForm as a completely standalone application with zero upstream dependency.
  - Update Rule 2.3: Remove upstream merge protocols; state that all new features and bug fixes are developed natively in KyndForm.
  - Update references to `docs/KYNDFORM_ARCHITECTURE_SPEC.md`.
- [ ] Rename `docs/FORK_ENHANCEMENTS_REGISTRY.md` to `docs/KYNDFORM_ARCHITECTURE_SPEC.md`, updating its header and preamble to reflect that this is the permanent specification of KyndForm's architecture and protected modules.
- [ ] Replace `docs/UPSTREAM_SYNC_GUIDE.md` with `docs/STANDALONE_ARCHITECTURE_GUIDE.md`, documenting:
  - Standalone repository philosophy (no upstream sync).
  - Monorepo package architecture (`packages/server`, `packages/webapp`, `packages/form-renderer`, `packages/answer-utils`, `packages/embed`, `packages/utils`, `packages/shared-types-enums`).
  - How new features, endpoints, and themes are added natively.
- [ ] In `docs/KYNDFORM_ADDITIONS_AND_FILE_TREE.md`:
  - Update repository references to `thewaqasPro/KyndForms`.
  - Update text to emphasize standalone status.
- [ ] In `docs/DOKPLOY_LAUNCH_PLAN.md`:
  - Update repository URL to `thewaqasPro/KyndForms`.

---

### Task 4: Verify Subpackage READMEs

**Files:**
- Check & Modify: `packages/server/resources/email-templates/README.md`

**Steps:**
- [ ] Review `packages/server/resources/email-templates/README.md` and ensure branding references KyndForm.
- [ ] Verify no outdated heyform references remain in documentation files.

---

### Task 5: Full Verification & Git Push

**Steps:**
- [ ] Run `pnpm run verify:integrity` to ensure architectural integrity passes.
- [ ] Run `pnpm type-check` across all workspace packages.
- [ ] Run `pnpm test` across unit test suites.
- [ ] Run `pnpm lint` across the monorepo.
- [ ] Commit all documentation and script updates:
  ```bash
  git commit -m "docs: establish standalone repository documentation and retire upstream sync scripts"
  ```
- [ ] Push to `origin main` at `https://github.com/thewaqasPro/KyndForms.git`.
