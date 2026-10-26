# KyndForm Architecture Specification

> **Purpose:** This document catalogs all architectural systems, custom capabilities, and module boundaries in **KyndForm**. Use this specification when modifying core packages to ensure zero regression of existing capabilities.

---

## 1. Monorepo & Infrastructure Architecture

| System | Implementation | Key Files |
| :--- | :--- | :--- |
| **Default Port** | `8000` default (exposes both `8000` and `9157` for backward compatibility) | `packages/server/src/environments/index.ts`, `Dockerfile` |
| **Docker Build** | Multi-stage Docker container with isolated `pnpm --prod deploy` runner layer | `Dockerfile` |
| **Workspace Utilities** | Dedicated `@kyndform/answer-utils` package for answer normalization & validation | `packages/answer-utils/` |
| **Lockfile Strategy** | Consolidated root `pnpm-lock.yaml` (nested subpackage lockfiles prohibited) | `pnpm-workspace.yaml`, `pnpm-lock.yaml` |
| **SCSS Preprocessor** | Modern Sass compiler configuration (`api: 'modern-compiler'`) | `packages/webapp/vite.config.mts`, `packages/form-renderer/package.json` |
| **Self-Hosted Embeds** | Embed script compiled and distributed directly to `/static/embed.js` & `/embed.js` | `packages/embed/scripts/copy-dist.js`, `packages/server/static/embed.js` |

---

## 2. Server Architecture (`packages/server`)

### A. Headless Form Engine & Dynamic Field Auto-Discovery
* **File:** `packages/server/src/controller/headless-form.controller.ts`
* **Route:** `POST /f/:formId`, `POST /api/f/:formId`
* **Capabilities**:
  * Accepts raw JSON payloads or multipart `FormData` from external clients (static sites, mobile apps, cURL).
  * Auto-infers field kinds (`FieldKindEnum.NUMBER`, `FieldKindEnum.DATE`, `FieldKindEnum.LONG_TEXT`, `FieldKindEnum.SHORT_TEXT`, `FieldKindEnum.FULL_NAME`) from incoming payload keys.
  * Dynamically discovers and auto-appends newly discovered fields to `form.fields` and `_drafts` in MongoDB when `autoCreateFields` is enabled on the form.
  * Automatically records hidden fields (`utm_*`, `ref_*`, `client_id`, etc.).
  * Multi-layer bot protection: Honeypot fields (`_gotcha`, `_honeypot`, `_bot`), reCAPTCHA integration, Akismet spam detection.
  * IP submission limiting via `SubmissionIpLimitService`.
  * Integration queue triggers for real-time webhooks, Slack, Discord, email notifications.
* **View Template:** `packages/server/view/form-submitted.html` (renders a clean confirmation page for standard HTML form posts).

### B. Project-Scoped Media & Asset Library
* **File:** `packages/server/src/controller/media.controller.ts`
* **Capabilities**:
  * Uploads assets to AWS S3 / MinIO storage.
  * Indexes media items scoped by `workspaceId` and `projectId`.
  * Allows media reuse across forms without re-uploading duplicate assets.

### C. Outbound URL & SSRF Hardening
* **File:** `packages/server/src/utils/outbound-url.ts`
* **Capabilities**: Validates outbound webhook, OAuth, and external avatar/image requests to prevent Server-Side Request Forgery (SSRF) against private/internal IPv4/IPv6 networks and loopback addresses (`127.0.0.1`, `172.16.x.x`, `169.254.169.254`).

### D. Apps & Webhook Integrations
* **Files:** `packages/server/src/apps/*` (`airtable.ts`, `discord.ts`, `email.ts`, `google-drive.ts`, `google-sheets.ts`, `hubspot.ts`, `lark-suite.ts`, `mailchimp.ts`, `notion.ts`, `slack.ts`, `telegram.ts`, `webhook.ts`, `zapier.ts`)
* **Capabilities**: Structured modular outbound notification connectors with payload limits and streaming protection (`readLimitedWebhookResponse`).

---

## 3. Webapp Architecture (`packages/webapp`)

### A. Headless Form Modal & Integration Snippets
* **File:** `packages/webapp/src/pages/form/Share/HeadlessModal.tsx`
* **Capabilities**: UI modal that generates syntax-highlighted code snippets for developers (HTML Form `<form>`, Next.js React component, Astro.js component, and cURL terminal requests).

### B. Syntax-Highlighted CodeBlock Component
* **File:** `packages/webapp/src/components/CodeBlock.tsx`
* **Capabilities**: Modern dark IDE code preview component with token-based syntax highlighting for HTML, JavaScript/TypeScript, Astro, and cURL, complete with snippet title, language badge, and clipboard copy action.

### C. Form Schema JSON File Import
* **Files:**
  * `packages/webapp/src/layouts/Workspace/TemplatesModel.tsx`: Adds file upload button for local `.json` form schema files.
  * `packages/webapp/src/services/form.ts`: `FormService.importFromJSON(projectId, formJson)` parses schemas and calls `updateFormSchemas`, `updateLogics`, and `updateTheme`.

### D. Project Media Picker & S3 Asset Library
* **File:** `packages/webapp/src/components/MediaPicker.tsx`
* **Capabilities**: Provides three tabs (Upload, Project Library, Unsplash) allowing instant reuse of previously uploaded assets within the active project.

### E. OAuth App Integration Service
* **File:** `packages/webapp/src/services/app.ts`
* **Capabilities**: Provides `AppService.detail` and `AppService.authorizationCode` helpers for OAuth client authorization flows in `packages/webapp/src/pages/auth/OAuth.tsx`.

---

## 4. Form Renderer Architecture (`packages/form-renderer`)

### A. Dual Layout Engine
* **Conversational Layout (`packages/form-renderer/src/views/Blocks.tsx`)**: Single-question conversational flow with keyboard hotkeys, smooth transitions, and inline question badges.
* **Classic Layout (`packages/form-renderer/src/views/Classic/`)**: Continuous single-page form view with responsive grid layout for multiple choice and picture choice options.

### B. Modern Inline Question Badges
* **File:** `packages/form-renderer/src/blocks/Block.tsx`
* **Capabilities**: Replaced rigid "Question X" text headers with inline rounded counter badges (`<span class="kyndform-block-number-badge">1</span>`) featuring accessible `aria-label="Question 1 of 10"`.

---

## 5. Architectural Verification

Run the verification suite to ensure all architectural components remain intact:
```bash
# 1. Verify architecture integrity
pnpm run verify:integrity

# 2. Type check all packages
pnpm run type-check

# 3. Run unit tests
pnpm run test

# 4. Verify linting
pnpm run lint
```
