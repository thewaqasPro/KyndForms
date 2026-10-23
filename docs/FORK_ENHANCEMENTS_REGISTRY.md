# KyndForm Fork Enhancements Registry

> **Purpose:** This document catalogs all custom enhancements, architectural divergences, and overlapping files between **KyndForm** and upstream **HeyForm** (`heyform/heyform` at base tag `v3.0.1`). Use this registry during upstream merges, rebases, and feature additions to ensure zero loss of custom functionality.

---

## 1. Monorepo & Infrastructure Divergence

| Area | Upstream HeyForm | KyndForm Enhancement | Key Files |
| :--- | :--- | :--- | :--- |
| **Default Port** | `9157` | `8000` default (exposes both `8000` and `9157`) | `packages/server/src/environments/index.ts`, `Dockerfile` |
| **Docker Build** | Standard pnpm build | Isolated `pnpm --prod deploy` runner layer | `Dockerfile` |
| **New Package** | Not present | `@kyndform/answer-utils` workspace package | `packages/answer-utils/` |
| **Lockfile Strategy** | Root lockfile | Consolidated root `pnpm-lock.yaml` (nested lockfiles prohibited) | `pnpm-workspace.yaml`, `pnpm-lock.yaml` |
| **SCSS Compiler** | Legacy Sass JS API | `api: 'modern-compiler'` for Sass | `packages/webapp/vite.config.mts`, `packages/form-renderer/package.json` |

---

## 2. Server Enhancements (`packages/server`)

### A. Headless Form Engine & Dynamic Field Auto-Discovery
* **File:** `packages/server/src/controller/headless-form.controller.ts`
* **Route:** `POST /f/:formId`, `POST /api/f/:formId`
* **Enhancements**:
  * Accepts raw JSON payloads or multipart FormData from external clients (static sites, mobile apps, cURL).
  * Auto-infers field kinds (`FieldKindEnum.NUMBER`, `FieldKindEnum.DATE`, `FieldKindEnum.LONG_TEXT`, `FieldKindEnum.SHORT_TEXT`, `FieldKindEnum.FULL_NAME`) from incoming keys/values.
  * Dynamically discovers and auto-appends newly discovered fields to `form.fields` and `_drafts` in MongoDB when `autoCreateFields` is enabled.
  * Discovers hidden fields (`utm_*`, `ref_*`, `client_id`, etc.) and records them automatically.
  * Multi-layer bot protection: Honeypot fields (`_gotcha`, `_honeypot`, `_bot`), reCAPTCHA integration, Akismet spam detection.
  * IP submission limiting via `SubmissionIpLimitService`.
  * Integration queue triggers for real-time webhooks, Slack, Discord, email notifications.
* **View Template:** `packages/server/view/form-submitted.html` (renders a clean confirmation page for standard HTML form posts).

### B. Outbound URL & SSRF Hardening
* **File:** `packages/server/src/utils/outbound-url.ts`
* **Enhancement**: Validates outbound webhook, OAuth, and external avatar/image requests to prevent Server-Side Request Forgery (SSRF) against private/internal IPv4/IPv6 networks and loopback addresses.

### C. Apps & Webhook Integrations
* **Files:** `packages/server/src/apps/*` (`airtable.ts`, `discord.ts`, `email.ts`, `google-drive.ts`, `google-sheets.ts`, `hubspot.ts`, `lark-suite.ts`, `mailchimp.ts`, `notion.ts`, `slack.ts`, `telegram.ts`, `webhook.ts`, `zapier.ts`)
* **Enhancement**: Structured modular outbound notification connectors with payload limits and streaming protection (`readLimitedWebhookResponse`).

---

## 3. Webapp Enhancements (`packages/webapp`)

### A. Headless Form Modal & Documentation
* **File:** `packages/webapp/src/pages/form/Share/HeadlessModal.tsx`
* **Enhancement**: UI modal that generates copy-paste code snippets (cURL, HTML Form, JavaScript fetch) for developers using the headless form submission API.
* **Overlapping File:** `packages/webapp/src/pages/form/Share/index.tsx` (mounted into the form share dashboard).

### B. Form Schema JSON File Import
* **Files:**
  * `packages/webapp/src/layouts/Workspace/TemplatesModel.tsx`: Adds file upload button for local `.json` form schema files.
  * `packages/webapp/src/services/form.ts`: `FormService.importFromJSON(projectId, formJson)` parses schemas and calls `updateFormSchemas`, `updateLogics`, and `updateTheme`.

### C. OAuth App Integration Service
* **File:** `packages/webapp/src/services/app.ts`
* **Enhancement**: Provides `AppService.detail` and `AppService.authorizationCode` helpers for OAuth client authorization flows in `packages/webapp/src/pages/auth/OAuth.tsx`.

### D. Theming & Custom CSS Properties
* **Files:** `packages/webapp/src/styles/builder.scss`, `packages/webapp/src/styles/render.scss`
* **Enhancement**: Support for dynamic CSS custom properties for custom branding, font scaling, and form color schemes.

---

## 4. Upstream Synchronization & Conflict Resolution Guide

When syncing changes from `upstream` (`https://github.com/heyform/heyform`), follow this protocol:

### Step 1: Fetch Upstream
```bash
git fetch upstream
```

### Step 2: Compare Differences Before Merging
```bash
# Check upstream commits not yet in your branch
git log --oneline HEAD..upstream/next

# Check diff on critical overlapping files
git diff HEAD..upstream/next -- packages/server/src/app.module.ts
git diff HEAD..upstream/next -- packages/webapp/src/services/form.ts
```

### Step 3: Resolving Common Conflicts

#### Case 1: Conflicts in `packages/server/src/app.module.ts` or `controller/index.ts`
* Upstream may add new controllers or modules.
* **Resolution**: Keep upstream's additions AND ensure `HeadlessFormController` and custom middleware remain registered.

#### Case 2: Conflicts in `packages/webapp/src/services/form.ts`
* Upstream may add new GraphQL query/mutation methods.
* **Resolution**: Keep upstream's new methods AND preserve `FormService.importFromJSON` and any custom schema mapping logic.

#### Case 3: Conflicts in `packages/webapp/src/pages/form/Share/index.tsx`
* Upstream may modify share tabs.
* **Resolution**: Ensure the `<HeadlessModal />` button and trigger remain preserved in the share options.

#### Case 4: Package/Lockfile Conflicts
* **Resolution**: Accept upstream dependencies, then run `pnpm install` at the **root directory only**. Never check in nested lockfiles.

### Step 4: Verification After Any Upstream Merge/Rebase
Always execute:
```bash
pnpm type-check
pnpm test
pnpm lint
pnpm build
```
All four checks must exit 0.
