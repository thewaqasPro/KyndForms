# Enterprise Reliability, Status Monitoring & Integration Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform KyndForm into an enterprise-grade, self-healing form platform with comprehensive system status diagnostics, Zapier-style integration failure detection & instant email alerting, persistent delivery logs with manual replay, and zero-data-loss dead letter queues.

**Architecture:** Implement an event-driven telemetry and resilience layer across `@kyndform/server` and `@kyndform/webapp`. The server monitors queue health and integration execution through Bull event listeners, records attempt logs in a capped/indexed MongoDB `IntegrationDeliveryLogModel`, trips circuit breakers upon repeated failures, and dispatches rich alert emails to form owners. A modular `StatusService` exposes deep health probes (Mongo, Redis, SMTP, S3, Queues) consumed by both public/admin status dashboards and uptime monitoring probes.

**Tech Stack:** NestJS, Bull (Redis-backed queues), MongoDB/Mongoose, MJML/Nodemailer (email alerting), React 18, TailwindCSS, Vite.

**Spec:** User architecture request for future-proofing, Zapier-style automated failure notifications, status information dashboard, and resilient submission/integration pipelines.

## Global Constraints
- Single root `pnpm-lock.yaml` policy across the monorepo; no isolated package installs.
- Zero regression of existing headless form controllers (`/f/:formId`, `/api/f/:formId`) or conversational/classic renderer logic.
- All outbound HTTP requests must pass through `assertSafeOutboundRequest` (SSRF protection).
- Outbound delivery failures must never block or slow down the respondent's submission response.
- All verification gates (`verify:integrity`, `type-check`, `test`, `lint`) must pass with 0 errors.

## Review Focus
- **Transient vs Fatal integration errors:** 5xx errors and network timeouts should retry with exponential backoff (e.g. 1m, 5m, 15m), whereas fatal 4xx errors (e.g. 404 Webhook Not Found, 401 Unauthorized) should fail immediately and notify without wasting queue cycles.
- **Alert Storm Throttling:** If 1,000 form submissions arrive while an integration endpoint is down, KyndForm must NOT send 1,000 alert emails; it must throttle notifications (e.g. 1 alert per broken integration per 6 hours, plus a summary in the UI).
- **Sensitive Payload Masking:** Delivery logs must sanitize and mask sensitive passwords, credit card tokens, and authorization headers before persisting logs to MongoDB.
- **Circuit Breaker Recovery:** When a broken integration is reconfigured or tested successfully by the user, its status must automatically reset from `BROKEN` to `ACTIVE`.
- **Zero-Latency Impact on Form Responders:** All status checks, delivery logging, and alerting must run strictly asynchronously off the request path.

---

### Task 1: Integration Delivery Log Schema & Failure State Model

**Files:**
- Create: `packages/server/src/model/integration-log.model.ts`
- Modify: `packages/server/src/model/integration.model.ts`
- Modify: `packages/server/src/model/index.ts`
- Test: `packages/server/test/model/integration-log.model.spec.ts`

**Interfaces:**
- Produces: `IntegrationDeliveryLogModel`, `IntegrationStatusEnum.BROKEN`, `IntegrationStatusEnum.DEGRADED`
- Consumes: Mongoose schema definitions from `@model`

- [x] **Step 1: Write the failing unit test for `IntegrationDeliveryLogModel`**
  Verify creation, TTL index (auto-expire logs after 30 days), and status tracking:
  ```typescript
  expect(log.status).toBe('failed')
  expect(log.attempts).toBe(3)
  expect(log.isAlertSent).toBe(true)
  ```

- [x] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter ./packages/server test`
  Expected: FAIL with missing `IntegrationDeliveryLogModel`.

- [x] **Step 3: Implement `IntegrationDeliveryLogModel` & update `IntegrationStatusEnum`**
  Define fields: `formId`, `integrationId`, `appId`, `submissionId`, `endpointUrl`, `requestHeaders`, `requestBody`, `responseStatus`, `responseBody`, `executionDurationMs`, `errorMessage`, `attempts`, `status: 'success' | 'failed'`, `isAlertSent`, `createdAt`.
  Add 30-day TTL index on `createdAt`.
  Add `lastFailureAt`, `consecutiveFailures`, `lastErrorMessage` to `IntegrationModel`.

- [x] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter ./packages/server test`
  Expected: PASS.

- [x] **Step 5: Commit**
  ```bash
  git add packages/server/src/model/
  git commit -m "feat(server): add integration delivery log schema and failure tracking"
  ```

---

### Task 2: Zapier-Style Integration Failure Alerting & Exponential Retry Queue

**Files:**
- Create: `packages/server/src/service/integration-delivery.service.ts`
- Modify: `packages/server/src/queue/integration-queue.ts`
- Modify: `packages/server/src/service/mail.service.ts`
- Create: `packages/server/src/templates/emails/integration-broken-alert.html`
- Test: `packages/server/test/service/integration-delivery.spec.ts`

**Interfaces:**
- Produces: `IntegrationDeliveryService.recordAttempt()`, `IntegrationDeliveryService.sendBrokenIntegrationAlert()`
- Consumes: `MailService`, `IntegrationModel`, `FormModel`, `UserModel`

- [x] **Step 1: Write the failing unit test for failure tracking and alert throttling**
  Test that consecutive failures trigger an alert email once, but subsequent failures within 6 hours are throttled.

- [x] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter ./packages/server test`
  Expected: FAIL with missing `IntegrationDeliveryService`.

- [x] **Step 3: Implement exponential retry and delivery logging in `IntegrationQueue`**
  Update `IntegrationQueue` options with 3 attempts and exponential backoff (`backoff: { type: 'exponential', delay: 60000 }`).
  Wrap `app.run()` in a performance timer:
  - On success: log successful delivery, reset `consecutiveFailures = 0`, ensure status is `ACTIVE`.
  - On catch error: record failure details in `IntegrationDeliveryLogModel`, increment `consecutiveFailures`.
  - If `job.attemptsMade >= job.opts.attempts`: mark integration status as `BROKEN`, format diagnostic payload, and call `mailService.sendIntegrationBrokenAlert()`.

- [x] **Step 4: Create MJML/HTML email template for broken integrations**
  Template includes:
  - Form Name & Workspace
  - Integration Name (Zapier / Webhook / Slack / Discord)
  - Endpoint URL & HTTP Status code
  - Failure reason (e.g. `Connection Timeout`, `404 Not Found`, `500 Server Error`)
  - Direct CTA button: "Inspect Delivery Logs & Fix Integration"

- [x] **Step 5: Run tests to verify all tests pass**
  Run: `pnpm --filter ./packages/server test`
  Expected: PASS.

- [x] **Step 6: Commit**
  ```bash
  git add packages/server/src/
  git commit -m "feat(server): implement automated integration failure detection and email alerting"
  ```

---

### Task 3: Comprehensive System Status & Deep Health Telemetry Service

**Files:**
- Create: `packages/server/src/service/status.service.ts`
- Modify: `packages/server/src/controller/health.controller.ts`
- Modify: `packages/server/src/service/index.ts`
- Test: `packages/server/test/service/status.service.spec.ts`

**Interfaces:**
- Produces: `GET /api/system/status`, `GET /health/live`, `GET /health/ready`
- Consumes: Mongoose Connection, RedisService, Bull Queue managers, StorageService, SMTP transporter

- [x] **Step 1: Write test for system status checks**
  Verify `/api/system/status` returns structured status:
  ```json
  {
    "status": "operational",
    "services": {
      "database": { "status": "up", "latencyMs": 5 },
      "queues": { "status": "up", "waiting": 0, "active": 1, "failed": 0 },
      "mailer": { "status": "up" },
      "storage": { "status": "up" }
    },
    "integrations24h": {
      "totalDelivered": 1500,
      "totalFailed": 2,
      "successRate": 99.86
    }
  }
  ```

- [x] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter ./packages/server test`
  Expected: FAIL.

- [x] **Step 3: Implement `StatusService` with multi-subsystem probe**
  Implement active latency checks for:
  - MongoDB `db.admin().ping()`
  - Redis ping + Bull queue stats (`integrationQueue.getJobCounts()`, `submissionNotificationQueue.getJobCounts()`)
  - SMTP transport verify
  - S3 / MinIO storage probe
  - 24-hour integration telemetry aggregation from `IntegrationDeliveryLogModel`

- [x] **Step 4: Expose endpoints in `HealthController`**
  - Public minimal probe: `GET /health/ready` (Kubernetes / Docker health check)
  - Admin detailed probe: `GET /api/system/status` (guarded by AdminGuard)

- [x] **Step 5: Run tests to verify it passes**
  Run: `pnpm --filter ./packages/server test`
  Expected: PASS.

- [x] **Step 6: Commit**
  ```bash
  git add packages/server/src/
  git commit -m "feat(server): add deep system health and queue telemetry probes"
  ```

---

### Task 4: Webapp UI: Integration Delivery Logs, Broken Badge & Replay Action

**Files:**
- Create: `packages/webapp/src/pages/form/Settings/Integrations/DeliveryLogsModal.tsx`
- Modify: `packages/webapp/src/pages/form/Settings/Integrations/index.tsx`
- Modify: `packages/webapp/src/services/integration.ts`
- Modify: `packages/server/src/resolver/integration/index.ts`
- Create: `packages/server/src/resolver/integration/get-integration-logs.resolver.ts`
- Create: `packages/server/src/resolver/integration/retry-integration-delivery.resolver.ts`

**Interfaces:**
- Produces: GraphQL queries `integrationLogs(formId, integrationId)`, `retryIntegrationDelivery(logId)`
- Consumes: `IntegrationDeliveryLogModel`, `IntegrationQueue`

- [x] **Step 1: Write GraphQL resolver for logs query and manual retry**
  Add pagination and status filter to `integrationLogs`.
  Add `retryIntegrationDelivery(logId)` which re-queues the submission with priority.

- [x] **Step 2: Implement UI Status Badges on Integrations Card**
  Display visual indicators on integration cards:
  - Green badge: `Active (100% delivered)`
  - Amber badge: `Degraded (Recent failures)`
  - Red badge: `Broken (Last attempt failed)` with "View Details" button.

- [x] **Step 3: Create `DeliveryLogsModal`**
  Modal features:
  - Table of past 50 deliveries with HTTP status pills (`200 OK`, `500 Internal Error`, `Timed Out`).
  - Expandable JSON payload inspector (Request payload vs Response).
  - "Retry Delivery" button to immediately resend failed submissions.

- [x] **Step 4: Verify webapp builds and type-checks**
  Run: `pnpm --filter ./packages/webapp build`
  Expected: Clean build with 0 errors.

- [x] **Step 5: Commit**
  ```bash
  git add packages/server/ packages/webapp/
  git commit -m "feat(webapp): add integration status badges, delivery log viewer, and manual replay"
  ```

---

### Task 5: Admin System Status & Service Health Dashboard

**Files:**
- Create: `packages/webapp/src/pages/admin/SystemStatus.tsx`
- Modify: `packages/webapp/src/pages/admin/index.tsx`
- Modify: `packages/webapp/src/components/AdminSidebar.tsx`
- Modify: `packages/webapp/src/routes.tsx`

**Interfaces:**
- Consumes: `GET /api/system/status` via `adminService.getSystemStatus()`

- [x] **Step 1: Implement Admin Status Page**
  Design a clean status dashboard showing:
  - System Status Overview card (All systems operational vs Partial outage)
  - Real-time Subsystem Health cards: MongoDB, Redis, Queue Workers, SMTP Mailer, Object Storage
  - Bull Queue throughput metrics: Active / Waiting / Failed jobs
  - Outbound Integrations Health: 24h success rate, average delivery latency, failure count
  - Manual "Run Diagnostics" button to refresh live probes

- [x] **Step 2: Add Route & Navigation Link in Admin Panel**
  Add `/admin/status` with server-side Admin guard protection.

- [x] **Step 3: Verify workspace linting and type-checks**
  Run: `pnpm run type-check && pnpm run lint`
  Expected: Exit code 0, 0 errors.

- [x] **Step 4: Commit**
  ```bash
  git add packages/webapp/
  git commit -m "feat(admin): add real-time system status and queue monitoring dashboard"
  ```

---

### Task 6: Full Verification Protocol

- [x] **Step 1: Verify architectural integrity**
  Run: `pnpm run verify:integrity`
  Expected: All checks pass.

- [x] **Step 2: Type check entire workspace**
  Run: `pnpm run type-check`
  Expected: Clean type check.

- [x] **Step 3: Run all unit tests**
  Run: `pnpm test`
  Expected: All unit tests pass.

- [x] **Step 4: Lint workspace**
  Run: `pnpm run lint`
  Expected: 0 errors.
