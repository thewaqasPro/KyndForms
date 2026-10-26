# Rich End Screen & Image Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide full rich text editing (headings, formatting, alignments), flexible image repositioning, and multi-button action destinations on form Thank You / End screens across both the form builder and the dual-layout form renderer.

**Architecture:** Extend `Property` in `@kyndform/shared-types-enums` and GraphQL schemas with end screen properties (`screenVariant`, `align`, `imagePosition`, `imageSize`, `buttons`). Enhance `FloatingToolbar` with heading format blocks (H1, H2, H3, P) and text alignment commands. Allow alignment attributes in `htmlUtils`. Refactor builder right sidebar `ThankYou` and `CoverAndLayout` to offer image placement and button configuration. Update `form-renderer` `ThankYou.tsx` and SCSS to render custom alignments, image layouts, and interactive action buttons (external links and form restarts).

**Tech Stack:** TypeScript, React 18, `@kyndform/shared-types-enums`, `@kyndform/answer-utils`, NestJS / GraphQL / Mongoose, TailwindCSS, SCSS.

**Spec:** User requirement: "On thank you screen. We don't have option to readjust the position of the image. Could you please add a rich text editor? Some kind of rich text editor on end screen. So we can adjust things maybe we have multiple end screen options. Once one is that we have as a default, and we need to create a new end screen version with in which we will we can add make a text line left center seeing the headings we can do whatever we need in order to add a rich text editor and maybe we need to maybe we might need to add some buttons where user can go."

## Global Constraints
- Preserve single root `pnpm-lock.yaml` policy.
- Zero HeyForm regressions; maintain KyndForm standalone naming.
- Backward compatibility: existing forms without `screenVariant` or `buttons` must render identically to current default behavior.
- All 4 verification protocol gates (`verify:integrity`, `type-check`, `test`, `lint`) must exit with code 0.

## Review Focus
- **Backward Compatibility:** Existing forms with simple thank you text and redirect must render without visual disruption.
- **Sanitization Integrity:** Adding alignment and heading support to `htmlUtils` must never open XSS or script injection vectors.
- **Button Interaction in Renderer:** Buttons configured for external URLs must validate protocols safely; "Restart / Fill Again" buttons must reset form state correctly without page reloads.
- **Layout Responsiveness:** Custom image positions (Top, Split, Float, Cover) and multiple buttons must wrap gracefully on mobile devices (`< 640px`).
- **Dark Mode Support:** All new end screen elements and buttons must support KyndForm theme variables and dark mode.

---

### Task 1: Type Definitions & GraphQL Schema Extensions

**Files:**
- Modify: `packages/shared-types-enums/src/form.ts`
- Modify: `packages/server/src/common/graphql/form.graphql.ts`
- Test: `pnpm --filter @kyndform/shared-types-enums build` and `pnpm --filter ./packages/server type-check`

**Interfaces:**
- Produces: `EndScreenButton` interface:
  ```ts
  export interface EndScreenButton {
    id: string
    text: string
    url?: string
    action?: 'url' | 'reload'
    variant?: 'primary' | 'secondary'
    newTab?: boolean
  }
  ```
- Extends: `Property` with `screenVariant?: 'default' | 'rich'`, `align?: 'left' | 'center' | 'right'`, `imagePosition?: 'top' | 'center' | 'bottom'`, `imageSize?: 'small' | 'medium' | 'large' | 'full'`, `buttons?: EndScreenButton[]`.
- Extends: `SharedPropertyInput`, `SharedProperty`, `PublicSharedProperty` in `packages/server/src/common/graphql/form.graphql.ts`.

- [ ] **Step 1: Update `@kyndform/shared-types-enums/src/form.ts`**
  Add `EndScreenButton` interface and extend `Property` with `screenVariant`, `align`, `imagePosition`, `imageSize`, and `buttons`.

- [ ] **Step 2: Build `@kyndform/shared-types-enums`**
  Run: `pnpm --filter @kyndform/shared-types-enums build`
  Expected: Clean build.

- [ ] **Step 3: Update `packages/server/src/common/graphql/form.graphql.ts`**
  Add `@InputType() EndScreenButtonInput` and `@ObjectType() EndScreenButton`. Add `screenVariant`, `align`, `imagePosition`, `imageSize`, and `buttons` to `SharedPropertyInput`, `SharedProperty`, and `PublicSharedProperty`.

- [ ] **Step 4: Verify server type-check**
  Run: `pnpm --filter ./packages/server type-check`
  Expected: Clean pass with 0 errors.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/shared-types-enums/ packages/server/src/common/graphql/form.graphql.ts
  git commit -m "feat(types): define EndScreenButton and rich end screen properties in schema"
  ```

---

### Task 2: Rich Text Sanitization & Formatting Preservations in `answer-utils`

**Files:**
- Modify: `packages/answer-utils/src/html-utils.ts`
- Test: `packages/answer-utils/test/html-utils.test.ts`

**Interfaces:**
- Consumes: Raw HTML strings from `RichText` editor.
- Produces: Sanitized HTML retaining safe alignment attributes (`align`, `style="text-align: ...;"`, `class="text-left|text-center|text-right"`) and headings (`h1`, `h2`, `h3`, `p`).

- [ ] **Step 1: Write unit tests in `html-utils.test.ts`**
  Add tests for preserving `text-align` styles, alignment classes, and heading elements (`h1`, `h2`, `h3`) while continuing to strip malicious script/event tags.

- [ ] **Step 2: Run test to observe failure**
  Run: `pnpm --filter @kyndform/answer-utils test test/html-utils.test.ts`
  Expected: Tests fail because text alignment styles or classes were stripped.

- [ ] **Step 3: Implement safe alignment preservation in `packages/answer-utils/src/html-utils.ts`**
  Allow `style` attribute (strictly filtered to safe `text-align: left|center|right|justify`), `align` attribute, and standard alignment classes.

- [ ] **Step 4: Run test to verify pass**
  Run: `pnpm --filter @kyndform/answer-utils test test/html-utils.test.ts`
  Expected: All tests pass.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/answer-utils/
  git commit -m "feat(answer-utils): preserve safe text alignment and heading formats in html-utils"
  ```

---

### Task 3: Builder Rich Text Editor Enhancement with Headings & Alignments

**Files:**
- Modify: `packages/webapp/src/pages/form/Builder/RichText/FloatingToolbar.tsx`
- Modify: `packages/webapp/src/pages/form/Builder/Compose/Blocks/Block.tsx`
- Modify: `packages/webapp/src/styles/builder.scss`

**Interfaces:**
- Produces: Enhanced `FloatingToolbar` offering:
  - Heading options: Normal (`p`), Heading 1 (`h1`), Heading 2 (`h2`), Heading 3 (`h3`) via `document.execCommand('formatBlock')`.
  - Alignment options: Left (`IconAlignLeft`), Center (`IconAlignCenter`), Right (`IconAlignRight`) via `document.execCommand('justifyLeft|Center|Right')`.
- Consumes: Tabler icons `IconAlignLeft`, `IconAlignCenter`, `IconAlignRight`, `IconHeading`.

- [ ] **Step 1: Enhance `FloatingToolbar.tsx`**
  Add text alignment actions (`justifyLeft`, `justifyCenter`, `justifyRight`) and heading dropdown / toggle buttons (`h1`, `h2`, `h3`, `p`).
  Ensure active state queries reflect current paragraph format and alignment.

- [ ] **Step 2: Update `packages/webapp/src/styles/builder.scss`**
  Remove the restrictive `.kyndform-thank-you { .kyndform-block-title, .kyndform-block-description { @apply text-left; } }` forced override. Allow text alignment classes (`text-left`, `text-center`, `text-right`, `kyndform-align-*`) to govern alignment.

- [ ] **Step 3: Verify builder type-check**
  Run: `pnpm --filter ./packages/webapp type-check`
  Expected: Clean pass with 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add packages/webapp/src/pages/form/Builder/RichText/ packages/webapp/src/styles/builder.scss
  git commit -m "feat(builder): add text alignment and heading blocks to rich text toolbar"
  ```

---

### Task 4: End Screen Configuration Sidebar (Image Positioning & Action Buttons)

**Files:**
- Modify: `packages/webapp/src/pages/form/Builder/RightSidebar/Question/ThankYou.tsx`
- Modify: `packages/webapp/src/pages/form/Builder/RightSidebar/Question/CoverAndLayout.tsx`
- Modify: `packages/webapp/src/pages/form/Builder/Compose/Blocks/ThankYou.tsx`
- Modify: `packages/webapp/src/pages/form/Builder/Compose/Blocks/Block.tsx`

**Interfaces:**
- Produces:
  - Screen Variant Switcher (`Default` vs `Rich Custom`).
  - Text Alignment Switcher (`Left`, `Center`, `Right`).
  - Image Placement Controls (`Top`, `Inline Below`, `Split Left`, `Split Right`, `Float Left`, `Float Right`, `Cover`).
  - Action Buttons Manager (Add, edit, remove buttons with labels, actions, links, target, and style variants).
  - Live builder preview of buttons and image positions in `Compose/Blocks/ThankYou.tsx`.

- [ ] **Step 1: Expand `RightSidebar/Question/ThankYou.tsx`**
  Implement:
  - Variant Selector: Default Screen vs. Rich Custom End Screen.
  - Overall Content Alignment: Left / Center / Right.
  - Action Buttons Section:
    - Toggle "Enable Buttons".
    - Button list with label, action (`Open URL` or `Restart Form`), URL field, open in new tab toggle, and style (`Primary` / `Secondary`).
    - Add Button button (max 4).
  - Retain existing redirect on completion settings.

- [ ] **Step 2: Update `CoverAndLayout.tsx` for Thank You Image Positioning**
  Provide image placement options for Thank You screens: Top (above title), Inline Below (below text), Float Left, Float Right, Split Left, Split Right, Full Cover.

- [ ] **Step 3: Update `Compose/Blocks/ThankYou.tsx` & `Block.tsx`**
  Render the live preview of action buttons, custom alignments, and image placements directly inside the builder canvas.

- [ ] **Step 4: Verify webapp type-check and build**
  Run: `pnpm --filter ./packages/webapp type-check && pnpm --filter ./packages/webapp build`
  Expected: Clean build in < 10s.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/webapp/src/pages/form/Builder/RightSidebar/Question/ packages/webapp/src/pages/form/Builder/Compose/
  git commit -m "feat(builder): add end screen variant switcher, image positioning, and button management"
  ```

---

### Task 5: Form Renderer End Screen Engine (Conversational & Classic)

**Files:**
- Modify: `packages/form-renderer/src/blocks/ThankYou.tsx`
- Modify: `packages/form-renderer/src/blocks/Block.tsx`
- Modify: `packages/form-renderer/src/style.scss`

**Interfaces:**
- Produces: Complete end screen rendering with:
  - Custom image positioning: Top, Inline Middle/Below, Split, Float, Cover.
  - Content alignment: `kyndform-align-left`, `kyndform-align-center`, `kyndform-align-right`.
  - Action buttons: Interactive buttons executing URL navigation (same/new tab) or form restart (`setIsStarted: false`, reset answers).
  - Works consistently in both Conversational and Classic form layouts.

- [ ] **Step 1: Update `packages/form-renderer/src/blocks/ThankYou.tsx`**
  - Read `field.properties?.buttons`, `field.properties?.align`, `field.properties?.imagePosition`.
  - Render action buttons row:
    - Primary and Secondary styled buttons.
    - Click handler for external URL navigation (`window.open` for newTab, `window.location.href` for sameTab).
    - Click handler for "Restart Form" dispatching reset action to store.
  - Retain existing completion redirect behavior.

- [ ] **Step 2: Update `packages/form-renderer/src/blocks/Block.tsx` & `style.scss`**
  - Support `imagePosition: 'top'` (render above the title/header).
  - Remove forced left alignment from `.kyndform-empty-state` so `field.properties?.align` applies correctly.
  - Add responsive styles for `.kyndform-action-buttons-group` (flex row on desktop, stack on mobile).

- [ ] **Step 3: Verify form-renderer builds cleanly**
  Run: `pnpm --filter @kyndform/form-renderer build`
  Expected: Clean build with 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add packages/form-renderer/
  git commit -m "feat(renderer): render rich end screen with custom image positioning and action buttons"
  ```

---

### Task 6: Full Verification Protocol

- [ ] **Step 1: Verify architectural integrity**
  Run: `pnpm run verify:integrity`
  Expected: 14/14 checks pass.

- [ ] **Step 2: Type check entire workspace**
  Run: `pnpm run type-check`
  Expected: Clean pass across all 7 workspace packages.

- [ ] **Step 3: Run all unit tests**
  Run: `pnpm test`
  Expected: All unit tests pass cleanly.

- [ ] **Step 4: Verify linting**
  Run: `pnpm run lint`
  Expected: 0 errors.
