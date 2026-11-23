# Universal Podium Integration (Global Workspace Connection & Local Custom Values) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable global workspace-level authentication for Podium (sharing OAuth credentials and auto-refreshed tokens across all forms) while providing rich per-form local settings (custom fallback lead names, multiple automation tags, and custom attribute UID mappings).

**Architecture:** A two-tier integration model separating authentication from campaign execution. Workspace-level credentials (OAuth Client ID, Secret, Refresh Token, Access Token, and Default Location UID) are stored centrally and inherited by all forms in that workspace. Per-form configurations specify campaign-level customizations (`defaultLeadName`, `customTags`, `attributeMappings`), which merge with the workspace credentials at execution time in `IntegrationQueue`. When OAuth tokens refresh, the workspace-level credentials are auto-updated so all forms remain in sync.

**Tech Stack:** NestJS, TypeScript, MongoDB/Mongoose, GraphQL, React, Tailwind CSS, Vite, Vitest.

---

## Global Constraints

- Must strictly adhere to `AGENTS.md` (no regression of headless engine, answer-utils, dual form renderer, or verification protocols).
- Single root `pnpm-lock.yaml` policy — never run package installations in subdirectories.
- Rebranding integrity — KyndForm branding only.
- Strict exit code 0 across all 4 verification commands: `verify:integrity`, `type-check`, `pnpm test`, `pnpm lint`.

---

## Review Focus

1. **Token Refresh Race Conditions**: When multiple forms trigger token refresh simultaneously, updates must persist to the shared workspace store without overwriting newer tokens.
2. **Backward Compatibility**: Existing forms configured with standalone per-form tokens must continue functioning without disruption unless explicitly migrated to the workspace connection.
3. **Missing Name Lead Formatting**: When a form collects only phone/email, the lead name must prioritize: form-provided name > form `defaultLeadName` > `${form.name} Lead` > email prefix > `Website Lead`.
4. **Invalid Tag / Attribute Rejection**: Tag UUIDs and custom attribute UIDs must be validated; unmapped or invalid attributes must not trigger Podium 400 Bad Request.
5. **Multi-Location Routing**: Forms with a custom `locationUid` must route to their specified branch instead of the workspace default location.

---

### Task 1: Local Custom Values & Fallback Name in Podium App

**Files:**
- Modify: `packages/server/src/apps/podium.ts`
- Modify: `packages/server/test/podium-app.test.ts`

- [x] **Step 1: Write failing unit test for `defaultLeadName`, multi-tag UUIDs, and custom attribute mappings**
  Add unit tests in `packages/server/test/podium-app.test.ts`:
  - `testCustomDefaultLeadName()`: Verifies that when a submission contains no name, `config.defaultLeadName` (e.g. `"Diamond Quiz Lead"`) is used instead of email or "Website Lead".
  - `testFormNameFallbackWhenDefaultLeadNameOmitted()`: Verifies that if `defaultLeadName` is omitted, `${form.name} Lead` is used.
  - `testMultipleTagUidsParsing()`: Verifies that comma-separated tag UUIDs in `customTag` or `customTags` are parsed and added to `payload.tags`.
  - `testCustomAttributeMapping()`: Verifies that `config.attributeMappings` maps question titles to Podium attribute UIDs in `{ uid, value }`.

- [x] **Step 2: Update `PodiumConfig` and `podium.ts` settings schema**
  In `packages/server/src/apps/podium.ts`:
  - Extend `PodiumConfig`:
    ```typescript
    export interface PodiumConfig {
      apiToken: string
      locationUid: string
      customTag?: string
      customTags?: string
      defaultLeadName?: string
      attributeMappings?: Record<string, string> // e.g. { "Ring Style": "c7b5a830-..." }
      useGlobalConnection?: boolean
      refreshToken?: string
      clientId?: string
      clientSecret?: string
    }
    ```
  - Add `defaultLeadName` setting to `settings` array:
    ```typescript
    {
      type: 'text',
      name: 'defaultLeadName',
      label: 'Default Lead Name (Fallback)',
      placeholder: 'e.g. Diamond Quiz Lead',
      required: false,
      description: 'Contact name to use if the submitter does not provide a name. Defaults to "{Form Name} Lead" if left blank.'
    }
    ```
  - Update `customTag` description and label to clarify multi-tag UUID support.

- [x] **Step 3: Update `buildPodiumContactPayload` logic**
  - Implement name resolution priority:
    1. If `fullName` extracted from submission answers exists -> use it.
    2. Else if `config.defaultLeadName?.trim()` -> use it.
    3. Else if `form?.name?.trim()` -> use `${form.name.trim()} Lead`.
    4. Else if `email` -> use email prefix capitalized.
    5. Else -> use `'Website Lead'`.
  - Parse `customTag` and `customTags`:
    - Split by comma/whitespace, match each against `uuidRegex`, filter unique valid UUIDs, and assign to `payload.tags`.
  - Process `attributeMappings`:
    - For each answer in submission, if `config.attributeMappings` matches the answer's title or clean key, map to `{ uid: config.attributeMappings[title], value: parsedValue }`.

- [x] **Step 4: Run unit tests and verify**
  Run `pnpm --filter ./packages/server exec ts-node --transpile-only -r tsconfig-paths/register test/podium-app.test.ts`.

- [x] **Step 5: Commit changes**
  `git commit -m "feat(podium): add custom default lead name, multi-tag parsing, and attribute mapping"`

---

### Task 2: Backend Workspace Integration Model & Execution Inheritance

**Files:**
- Create/Modify: `packages/server/src/model/workspace-integration.model.ts` (or `team-integration.model.ts`)
- Modify: `packages/server/src/model/module.ts`
- Modify: `packages/server/src/service/integration.service.ts`
- Modify: `packages/server/src/queue/integration-queue.ts`
- Create/Modify: `packages/server/src/resolver/workspace/workspace-integration.resolver.ts`

- [x] **Step 1: Define Workspace Integration Model**
  Create `packages/server/src/model/workspace-integration.model.ts`:
  ```typescript
  @Schema({ timestamps: true })
  export class WorkspaceIntegrationModel extends Document {
    @Prop({ required: true, index: true })
    teamId: string

    @Prop({ required: true })
    appId: string

    @Prop({ type: Map, default: {} })
    config: Record<string, any>

    @Prop({ default: true })
    isActive: boolean
  }
  ```
  Register in `packages/server/src/model/module.ts`.

- [x] **Step 2: Add Workspace Integration Service methods**
  In `packages/server/src/service/integration.service.ts`:
  - `getWorkspaceIntegration(teamId: string, appId: string)`: Retrieves global connection credentials.
  - `updateWorkspaceIntegration(teamId: string, appId: string, config: Record<string, any>)`: Upserts global credentials.

- [x] **Step 3: Update `IntegrationQueue` to merge Global & Local configs**
  In `packages/server/src/queue/integration-queue.ts`:
  - When preparing `config` for `app.run`:
    - Check if `form.teamId` has a global workspace integration for `appId`.
    - If form config has `useGlobalConnection !== false` and workspace config exists:
      - Merge configs:
        ```typescript
        const effectiveConfig = {
          ...workspaceIntegration.config,
          ...formIntegration.config
        }
        ```
    - In `onConfigUpdate`:
      - If tokens (`apiToken`, `refreshToken`) were refreshed:
        - Update `workspaceIntegration` so **all forms** immediately benefit from the fresh tokens.
        - Also update the triggering form integration.

- [x] **Step 4: Add GraphQL Query & Mutation for Workspace Integrations**
  - Query: `workspaceIntegration(teamId: string, appId: string)`
  - Mutation: `updateWorkspaceIntegration(teamId: string, appId: string, config: JSONObject)`

- [x] **Step 5: Write unit tests verifying configuration merging & token persistence**
  Add unit tests in `packages/server/test/workspace-integration.test.ts`.

- [x] **Step 6: Commit changes**
  `git commit -m "feat(server): support workspace-level global integration credentials with auto-refresh"`

---

### Task 3: Webapp Form Settings Modal Enhancements

**Files:**
- Modify: `packages/webapp/src/pages/form/Integrations/IntegrationSettingsModal.tsx`
- Modify: `packages/webapp/src/pages/form/Integrations/IntegrationSettingsItem.tsx`

- [x] **Step 1: Add Global Connection Indicator in Form Settings Modal**
  In `packages/webapp/src/pages/form/Integrations/IntegrationSettingsModal.tsx`:
  - Check if the workspace has a connected global integration for this app.
  - If a global connection exists:
    - Display a banner:
      `✓ Using Workspace Global Connection (Location: <locationUid>)`
    - Provide a toggle: `[✓] Use Workspace Connection`.
    - When enabled, hide the redundant credential fields (`apiToken`, `refreshToken`, `clientId`, `clientSecret`) and display the local fields (`defaultLeadName`, `customTags`, `attributeMappings`, `overrideLocationUid`).

- [x] **Step 2: Add Custom Attribute Mapping UI component**
  - Add a key-value or select-to-input mapper allowing merchants to associate form question titles with Podium attribute UUIDs.

- [x] **Step 3: Test UI reactivity and save behavior**
  Verify in browser preview that toggling workspace connection correctly saves the form integration config.

- [x] **Step 4: Commit changes**
  `git commit -m "feat(webapp): provide workspace connection toggle and local custom field inputs in modal"`

---

### Task 4: Webapp Workspace Settings Integrations Hub

**Files:**
- Create: `packages/webapp/src/pages/workspace/Settings/Integrations.tsx`
- Modify: `packages/webapp/src/pages/workspace/Settings/index.tsx`
- Modify: `packages/webapp/src/router/routes.tsx`

- [x] **Step 1: Create Workspace Integrations page**
  In `packages/webapp/src/pages/workspace/Settings/Integrations.tsx`:
  - Render an Integrations Hub listing supported global apps (Podium, Klaviyo, Google Sheets).
  - Clicking "Configure" on Podium opens the global credential form:
    - OAuth Client ID
    - OAuth Client Secret
    - Refresh Token
    - Default Location UID
    - API Access Token
  - Displays connection health and allows test verification.

- [x] **Step 2: Add "Integrations" tab to Workspace Settings navigation**
  Update `packages/webapp/src/pages/workspace/Settings/index.tsx` to include an "Integrations" sidebar/tab option alongside General, Branding, BrandKit, and Members.

- [x] **Step 3: Commit changes**
  `git commit -m "feat(webapp): add dedicated Integrations hub in Workspace Settings"`

---

### Task 5: Verification & End-to-End Testing

- [x] **Step 1: Execute KyndForm integrity verification**
  Run `pnpm run verify:integrity` and confirm all 14 architectural checks pass.
- [x] **Step 2: Type check entire workspace**
  Run `pnpm run type-check` across all workspace projects.
- [x] **Step 3: Run all unit and integration test suites**
  Run `pnpm test` and server integration tests.
- [x] **Step 4: Verify linting**
  Run `pnpm lint` and ensure 0 errors across all files.
- [x] **Step 5: Final review and handoff**
