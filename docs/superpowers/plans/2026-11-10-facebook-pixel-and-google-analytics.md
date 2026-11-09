# Facebook Pixel and Google Analytics Official Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide first-class, official integrations for Facebook Pixel (Meta Pixel) and Google Analytics (GA4) with UI configuration in the form integrations dashboard and automated PageView & Lead conversion tracking on published forms.

**Architecture:** 
1. Define official apps `facebook-pixel` and `google-analytics` in `packages/server/src/apps/` using the declarative App definition standard.
2. Update the public form GraphQL resolver (`publicForm` in `form-detail.resolver.ts`) to return active client-side analytics configurations for active forms.
3. Enhance the webapp form renderer (`Renderer.tsx`) to dynamically load tracking scripts asynchronously, initialize pixels safely without duplicate scripts, track `PageView` on load, and track `Lead` / `generate_lead` conversion events upon form submission.
4. Activate the user's requested Facebook Pixel ID (`751374180786271`) for their form.

**Tech Stack:** TypeScript, NestJS, GraphQL / Apollo, React, Vite, Vitest

**Spec:** User request to integrate Facebook Pixel code `751374180786271` to form, support official integration architecture, and provide Google Analytics support.

## Global Constraints
- Must adhere to KyndForm's existing declarative App schema in `packages/server/src/apps/`.
- Must not block form loading or submission if 3rd-party ad-blockers block `fbevents.js` or `googletagmanager.com`.
- Must sanitize Pixel ID and Measurement ID inputs against script injection.
- Zero TypeScript type-check errors across the monorepo (`pnpm run type-check`).
- All existing and new tests must pass (`pnpm test`).

## Review Focus
- **Ad-blocker resilience:** Form rendering and submission must succeed smoothly even when `fbq` or `gtag` scripts fail to download or are blocked by browser extensions.
- **Multiple/Duplicate script prevention:** Opening forms multiple times or re-rendering components must not re-inject duplicate `<script>` tags into `document.head`.
- **Measurement ID format normalization:** Accept both GA4 Measurement IDs (`G-XXXXXXXXXX`) and Universal Analytics legacy IDs (`UA-XXXXXXXX-X`) or raw tracking codes cleanly with trimmed whitespace.
- **Pixel ID format normalization:** Trim spaces from user-supplied Pixel IDs (e.g. `751374180786271`).
- **Security:** Ensure inputs are strictly validated as alphanumeric/hyphen IDs and never evaluated as raw unescaped HTML strings.

---

### Task 1: Create Server Apps for Facebook Pixel and Google Analytics

**Files:**
- Create: `packages/server/src/apps/facebook-pixel.ts`
- Create: `packages/server/src/apps/google-analytics.ts`
- Modify: `packages/server/src/apps/index.ts:1-16`
- Test: `packages/server/test/analytics-apps.test.ts`

**Interfaces:**
- Produces: `facebookPixel` and `googleAnalytics` app objects conforming to `App` definition with `id`, `name`, `description`, `icon`, and `settings`.

- [ ] **Step 1: Write unit test for Facebook Pixel and Google Analytics app definitions**

Create `packages/server/test/analytics-apps.test.ts` verifying that `facebookPixel` and `googleAnalytics` export valid app schemas, icons, and required setting fields (`pixelId` and `measurementId`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter ./packages/server test analytics-apps`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `packages/server/src/apps/facebook-pixel.ts` and `packages/server/src/apps/google-analytics.ts`**

Export default app objects with:
- Facebook Pixel:
  - `id`: `'facebook-pixel'`
  - `name`: `'Facebook Pixel'`
  - `description`: `'Track form pageviews, visitor engagement, and conversion events for your Meta and Facebook ad campaigns.'`
  - `icon`: `'/static/facebookpixel.png'`
  - `settings`: `pixelId` field with validation pattern `^[0-9]{5,25}$`.
- Google Analytics:
  - `id`: `'google-analytics'`
  - `name`: `'Google Analytics'`
  - `description`: `'Connect Google Analytics 4 (GA4) to track form views and submission conversion events.'`
  - `icon`: `'/static/googleanalytics.png'`
  - `settings`: `measurementId` field with placeholder `e.g. G-XXXXXXXXXX`.
Export them in `packages/server/src/apps/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter ./packages/server test analytics-apps`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/apps/facebook-pixel.ts packages/server/src/apps/google-analytics.ts packages/server/src/apps/index.ts packages/server/test/analytics-apps.test.ts
git commit -m "feat(server): add official Facebook Pixel and Google Analytics apps"
```

---

### Task 2: Expose Form Tracking Integrations in Public Form API

**Files:**
- Modify: `packages/server/src/resolver/form/form-detail.resolver.ts:63-76`
- Test: `packages/server/test/public-form-tracking.test.ts`

**Interfaces:**
- Consumes: `IntegrationService.findAllInFormByApps` from `@service`.
- Produces: `publicForm.integrations` map populated with `{ 'facebook-pixel': { pixelId: '...' }, 'google-analytics': { measurementId: '...' } }`.

- [ ] **Step 1: Write unit test for publicForm integration resolver mapping**

Create test in `packages/server/test/public-form-tracking.test.ts` mocking active integrations for a form and ensuring `publicForm` resolves their tracking configurations in `integrations`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter ./packages/server test public-form-tracking`
Expected: FAIL.

- [ ] **Step 3: Update `form-detail.resolver.ts`**

Inject `IntegrationService` and query active integrations for `['facebook-pixel', 'google-analytics']`, populating `integrations` dictionary on `PublicFormType`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter ./packages/server test public-form-tracking`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/resolver/form/form-detail.resolver.ts packages/server/test/public-form-tracking.test.ts
git commit -m "feat(server): expose active tracking integrations in publicForm query"
```

---

### Task 3: Client-Side Tracking Injection & Event Handlers in Form Renderer

**Files:**
- Create: `packages/webapp/src/pages/form/Render/utils/tracking.ts`
- Modify: `packages/webapp/src/pages/form/Render/components/Renderer.tsx`
- Test: `packages/webapp/test/tracking.test.ts`

**Interfaces:**
- Consumes: `form.integrations` from `PublicFormType`.
- Produces:
  - `initTracking(integrations, form)`: dynamically loads official FB Pixel and GA4 SDKs, executes `fbq('init')`, `fbq('track', 'PageView')`, and `gtag('config')`.
  - `trackFormSubmission(integrations, form)`: fires `fbq('track', 'Lead')` and `gtag('event', 'generate_lead')`.

- [ ] **Step 1: Write unit tests for tracking helper functions**

In `packages/webapp/test/tracking.test.ts`, test:
- `initTracking` correctly loads SDKs and executes `fbq` and `gtag` window globals when configured.
- `trackFormSubmission` fires conversion events.
- Gracefully handles missing configs or ad-blocker environments.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter ./packages/webapp test tracking`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/webapp/src/pages/form/Render/utils/tracking.ts` and integrate in `Renderer.tsx`**

- Implement safe script loaders and event dispatchers in `tracking.ts`.
- Call `initTracking` inside `useEffect` in `Renderer.tsx`.
- Call `trackFormSubmission` inside `handleSubmit` in `Renderer.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter ./packages/webapp test tracking`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/webapp/src/pages/form/Render/utils/tracking.ts packages/webapp/src/pages/form/Render/components/Renderer.tsx packages/webapp/test/tracking.test.ts
git commit -m "feat(webapp): add dynamic client-side tracking for Facebook Pixel and Google Analytics"
```

---

### Task 4: Connect Existing Form with User's Facebook Pixel ID

**Files:**
- Script / CLI task to link form `dVljkyBz` ("Find Your Dream Ring") with Facebook Pixel ID `751374180786271`.

- [ ] **Step 1: Save active integration in MongoDB**

Upsert `IntegrationModel` record for form `dVljkyBz` with `appId: 'facebook-pixel'`, `status: 1`, `config: { pixelId: '751374180786271' }`.

- [ ] **Step 2: Verify integration via database & API**

Ensure the integration record is active and readable via `FormService.integrations('dVljkyBz')`.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore: enable Facebook Pixel 751374180786271 on form dVljkyBz"
```

---

### Task 5: End-to-End Verification and Production Build

- [ ] **Step 1: Run project-wide type-checking**

Run: `pnpm run type-check`
Expected: 0 errors across all 7 workspace projects.

- [ ] **Step 2: Run all unit test suites**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 3: Run full production build**

Run: `pnpm build`
Expected: Build succeeds with 0 errors.
