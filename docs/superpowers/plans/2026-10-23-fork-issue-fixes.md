# Fork Issue Remediation & Type Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 13 TypeScript errors in `packages/webapp`, fix missing service methods, prevent Vitest from hanging in watch mode, eliminate duplicate/nested lockfiles, and ensure type checks and builds cleanly pass across the entire monorepo.

**Architecture:** Target the root causes identified across the 23 fork commits: implement the missing `importFromJSON` and `AppService` OAuth helpers in the webapp service layer, resolve React 18/19 type conflicts in JSX event handlers and library contexts, remove dead/unused imports and invalid HTML attributes, clean up nested lockfiles, and configure non-interactive test scripts.

**Tech Stack:** TypeScript 5, React 19, pnpm workspace, Vite, Vitest, NestJS.

**Spec:** User request to fix compilation, code quality, and implementation issues introduced in the 23 fork commits while keeping changes on the active development branch.

## Global Constraints

- Preserve all 23 custom commits and keep fixes directly on the `next` branch.
- Zero TypeScript compile errors (`pnpm --filter ./packages/webapp type-check` and `pnpm --filter ./packages/server type-check` must exit 0).
- Monorepo lockfiles consolidated to root `pnpm-lock.yaml`.

## Review Focus

1. `FormService.importFromJSON`: Verify JSON parsing and subsequent form creation and schema update with error resilience.
2. `Input.tsx`: Ensure `onChange` event handles both `<input>` and `<textarea>` without breaking existing input masking, limits, or IME composition events.
3. `RichText`: Ensure placeholder displays cleanly using `data-placeholder` without invalid DOM attributes.
4. `InputOTP` & `Flow`: Ensure React 19 context and component types compile cleanly with underlying React 18 component definitions.
5. `answer-utils`: Ensure `pnpm test` runs non-interactively in CI/scripts.

---

### Task 1: Clean Up Duplicate Lockfiles and Vitest Watch Script

**Files:**
- Delete: `packages/embed/pnpm-lock.yaml`
- Delete: `packages/webapp/pnpm-lock.yaml`
- Modify: `packages/answer-utils/package.json`

- [ ] **Step 1: Remove nested lockfiles**
Remove `packages/embed/pnpm-lock.yaml` and `packages/webapp/pnpm-lock.yaml` to prevent split-brain workspace dependencies.

- [ ] **Step 2: Update `answer-utils` test script to non-interactive mode**
In `packages/answer-utils/package.json`, update `"test": "vitest"` to `"test": "vitest run"`.

- [ ] **Step 3: Verify tests run non-interactively and exit 0**
Run `pnpm --filter ./packages/answer-utils test` and verify it completes without hanging.

---

### Task 2: Implement Missing Service Methods in Webapp

**Files:**
- Modify: `packages/webapp/src/services/form.ts`
- Modify: `packages/webapp/src/services/app.ts`

- [ ] **Step 1: Add `importFromJSON` to `FormService`**
In `packages/webapp/src/services/form.ts`, implement `static async importFromJSON(projectId: string, formJson: string): Promise<string>`.
Parse the JSON string, invoke `FormService.create` to initialize the form, optionally update schema via `FormService.updateSchemas` if fields/settings exist, and return the `formId`.

- [ ] **Step 2: Add `detail` and `authorizationCode` methods to `AppService`**
In `packages/webapp/src/services/app.ts`, implement:
- `static async detail(clientId?: string, redirectUri?: string): Promise<AppType | undefined>`
- `static async authorizationCode(clientId?: string, redirectUri?: string): Promise<string>`

- [ ] **Step 3: Fix `avatar` property usage in `OAuth.tsx`**
In `packages/webapp/src/pages/auth/OAuth.tsx`, change `app?.avatar` to `app?.icon`.

---

### Task 3: Resolve React 19 Type Conflicts and JSX Attribute Errors

**Files:**
- Modify: `packages/webapp/src/components/Input.tsx`
- Modify: `packages/webapp/src/components/InputOTP.tsx`
- Modify: `packages/webapp/src/pages/auth/SocialLogin.tsx`
- Modify: `packages/webapp/src/pages/form/Builder/LogicFlow/Flow.tsx`
- Modify: `packages/webapp/src/pages/form/Builder/RichText/index.tsx`
- Modify: `packages/webapp/src/pages/project/Forms/FormItem.tsx`
- Modify: `packages/webapp/src/pages/auth/Login.tsx`
- Modify: `packages/webapp/src/pages/workspace/Settings/index.tsx`

- [ ] **Step 1: Fix `Input.tsx` input event handling**
Change `onInput={handleChange}` to `onChange={handleChange}` on `<input>` and `<textarea>` in `packages/webapp/src/components/Input.tsx`.

- [ ] **Step 2: Fix `InputOTP.tsx` context type mismatch**
Cast `OTPInputContext as any` in `useContext(OTPInputContext as any)` in `packages/webapp/src/components/InputOTP.tsx`.

- [ ] **Step 3: Remove invalid `variant="outline"` on Button in `SocialLogin.tsx`**
Remove `variant="outline"` from the `<Button>` component in `packages/webapp/src/pages/auth/SocialLogin.tsx`.

- [ ] **Step 4: Fix `Flow.tsx` connectionLineComponent typing**
Cast `connectionLineComponent={ConnectionLine as any}` in `packages/webapp/src/pages/form/Builder/LogicFlow/Flow.tsx`.

- [ ] **Step 5: Fix `RichText/index.tsx` placeholder on div**
Replace `placeholder={placeholder}` with `data-placeholder={placeholder}` on the contenteditable `<div>` in `packages/webapp/src/pages/form/Builder/RichText/index.tsx`.

- [ ] **Step 6: Fix `FormItem.tsx` Link children typing**
Cast `{children as any}` inside `<Link to={to} {...restProps}>` in `packages/webapp/src/pages/project/Forms/FormItem.tsx`.

- [ ] **Step 7: Remove unused imports triggering `noUnusedLocals`**
- Remove unused `import SocialLogin from './SocialLogin'` in `packages/webapp/src/pages/auth/Login.tsx`.
- Remove unused `import { AnchorNavigation } from '@/components'` in `packages/webapp/src/pages/workspace/Settings/index.tsx`.

---

### Task 4: Fix `useKey` Stale Closure and Embed Duplicate Statement

**Files:**
- Modify: `packages/webapp/src/utils/hook.ts`
- Modify: `packages/embed/src/index.ts`

- [ ] **Step 1: Fix `useKey` dependency array in `hook.ts`**
In `packages/webapp/src/utils/hook.ts`, pass `[handleKeyDown]` to `useEffect` instead of `[]` to prevent stale closure bugs when key or callback changes.

- [ ] **Step 2: Remove duplicated line in `embed/src/index.ts`**
In `packages/embed/src/index.ts`, remove the duplicate `(window as any).KyndForm = api;`.

---

### Task 5: Monorepo Verification & Validation

**Files:**
- Modify: `package.json` (add convenience scripts)

- [ ] **Step 1: Add monorepo `type-check` script to root `package.json`**
Add `"type-check": "pnpm -r run type-check"` to root `package.json`.

- [ ] **Step 2: Run type check across webapp, server, embed, and form-renderer**
Verify that all packages pass TypeScript checking with 0 errors.

- [ ] **Step 3: Run full monorepo build**
Run `pnpm build` and ensure packages, server, and webapp build successfully.
