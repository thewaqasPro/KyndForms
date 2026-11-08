# Rich Integration Delivery Logs & Active Integrations Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide deep diagnostic inspection in the Delivery Logs modal (request payloads, formatted response bodies, endpoint details, one-click copy) and reorganize the Form Integration Settings page so active/connected integrations are prioritized at the top while available/unconnected options display below.

**Architecture:** 
1. Enhance the Integration Delivery telemetry pipeline in `@kyndform/server`: capture outbound request payload, exact endpoint URL/method, and complete response bodies on both success and error paths in `IntegrationDeliveryLogModel` and GraphQL schema.
2. Upgrade `packages/webapp` `DeliveryLogsModal.tsx`: introduce tabbed inspection (Request Payload, Response Body, Diagnostic Headers & Metadata) with JSON code blocks and quick copy.
3. Update `packages/webapp` `FormIntegrations`: partition `integratedApps` into two dedicated sections: "Active Integrations" (top) and "Available Integrations" (bottom) or sorted by active state with responsive grid layouts.

**Tech Stack:** NestJS, Mongoose, Apollo GraphQL, React, Tailwind CSS, Tabler Icons, Vitest.

---

## Global Constraints

- Never expose plain-text API keys, Bearer tokens, or webhook secrets in stored request payloads.
- Retain backward compatibility for all existing integration delivery log queries and historical records.
- Ensure 0 regressions in monorepo type checks (`pnpm run type-check`) and existing unit tests.

---

## Tasks

### Task 1: Server Model & GraphQL Schema Diagnostics Enhancement

**Files:**
- Modify: `packages/server/src/model/integration-log.model.ts`
- Modify: `packages/server/src/common/graphql/integration.graphql.ts`
- Modify: `packages/server/src/resolver/integration/get-integration-logs.resolver.ts`
- Modify: `packages/server/src/service/integration-delivery.service.ts`

- [ ] **Step 1: Extend Mongoose model and interface**
  Add `requestPayload` (String) and `requestMethod` (String) fields to `IntegrationDeliveryLogModel` and `RecordAttemptOptions`.
- [ ] **Step 2: Extend GraphQL type definitions**
  Add `requestPayload` and `requestMethod` to `IntegrationDeliveryLogType` in `packages/server/src/common/graphql/integration.graphql.ts`.
- [ ] **Step 3: Update GraphQL Resolver**
  Map `requestPayload` and `requestMethod` from `log` to the resolver output in `GetIntegrationLogsResolver`.
- [ ] **Step 4: Update Delivery Service storage**
  Ensure `requestPayload` and `requestMethod` are stored in MongoDB with a safe character limit (e.g. 10,000 characters).

---

### Task 2: Capture Outbound Payloads & Responses in Integration Queue & Apps

**Files:**
- Modify: `packages/server/src/queue/integration-queue.ts`
- Modify: `packages/server/src/apps/klaviyo.ts`
- Modify: `packages/server/src/apps/zapier.ts`
- Modify: `packages/server/src/apps/hubspot.ts`
- Modify: `packages/server/src/apps/mailchimp.ts`
- Modify: `packages/server/src/apps/airtable.ts`

- [ ] **Step 1: Standardize App Run return diagnostics**
  Allow `app.run` to optionally return `{ endpointUrl?: string, requestMethod?: string, requestPayload?: any, responseBody?: any }`.
- [ ] **Step 2: Update Klaviyo App execution**
  In `packages/server/src/apps/klaviyo.ts`, capture both Step 1 (Profile Upsert) and Step 2 (List Subscription) payloads and API responses, returning them as combined diagnostic details.
- [ ] **Step 3: Update Integration Queue logging**
  In `packages/server/src/queue/integration-queue.ts`, pass the captured request payload, endpoint, and response body into `deliveryService.recordAttempt` on both success and failure branches.
- [ ] **Step 4: Test and verify queue telemetry**
  Run unit test suite `packages/server/test/klaviyo.test.ts` to ensure queue dispatches and app runs operate correctly.

---

### Task 3: Prioritize Active Integrations at the Top of Form Settings

**Files:**
- Modify: `packages/webapp/src/pages/form/Integrations/index.tsx`
- Modify: `packages/webapp/src/store/form.ts`

- [ ] **Step 1: Sort / Partition Integrated Apps in store or component**
  In `packages/webapp/src/pages/form/Integrations/index.tsx`, group `integratedApps` into:
  - `activeApps`: apps where `app.status === APP_STATUS_ENUM.ACTIVE`
  - `availableApps`: apps where `app.status !== APP_STATUS_ENUM.ACTIVE`
- [ ] **Step 2: Design Two-Tier Visual Hierarchy**
  - **Active Integrations Section (Top):** Render a dedicated card container or grid highlighting active integrations with live health badges (`Active`, `Degraded`, `Broken`), toggle switch, direct Edit button, and "View Logs" shortcut button.
  - **Available Integrations Section (Bottom):** Render available catalog apps with a clean header: "Available Integrations" and "Connect" buttons.
- [ ] **Step 3: Handle empty active state cleanly**
  If no apps are active yet, show a clean banner or render the unified catalog without awkward blank spaces.

---

### Task 4: Upgrade Delivery Logs Modal with Deep Inspection UI

**Files:**
- Modify: `packages/webapp/src/consts/gql.ts`
- Modify: `packages/webapp/src/pages/form/Integrations/DeliveryLogsModal.tsx`

- [ ] **Step 1: Update GraphQL query**
  Add `requestPayload` and `requestMethod` to `GET_INTEGRATION_LOGS_GQL` in `packages/webapp/src/consts/gql.ts`.
- [ ] **Step 2: Update `DeliveryLogItem` interface**
  Add `requestPayload?: string` and `requestMethod?: string` to `DeliveryLogItem` in `DeliveryLogsModal.tsx`.
- [ ] **Step 3: Build Diagnostic Inspector Tabs in modal**
  When a log row is expanded or inspected:
  - Header: Target URL, HTTP Method badge (e.g. `POST`), Status Code badge (`200 OK`, `400 Bad Request`), and Execution Latency (`142ms`).
  - Tab 1: **Request Payload** – pretty-printed JSON code block with syntax formatting and a 1-click "Copy JSON" button.
  - Tab 2: **Response Body** – pretty-printed JSON or text response with 1-click "Copy JSON" button.
  - Tab 3: **Submission Context** – Form ID, Submission ID, and timestamp.
- [ ] **Step 4: Add Filter/Search Bar in Delivery Logs**
  Add quick filter tabs or search (All, Success, Failed) to easily locate failed delivery attempts.

---

### Task 5: End-to-End Verification

- [ ] **Step 1: Monorepo Type Check**
  Run `pnpm run type-check` across all workspace packages and verify 0 errors.
- [ ] **Step 2: Automated Unit Tests**
  Run server tests and webapp tests (`pnpm --filter ./packages/webapp test -- --run`).
- [ ] **Step 3: Git Status & Code Review**
  Review all modified files for clean formatting and documentation integrity.
