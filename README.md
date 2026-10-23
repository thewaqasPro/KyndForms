<br /><br />

<div align="center">
  <h1 align="center">
    <b>KyndForm</b>
  </h1>
  <p><b>Next-generation open-source conversational and headless form platform</b></p>
  <p>An enhanced, production-hardened version of <a href="https://github.com/heyform/heyform">HeyForm</a> with headless APIs, SSRF protection, dynamic field auto-discovery, and enterprise deployment tooling.</p>
</div>

<img src="./assets/images/screenshot.png" alt="KyndForm" />

---

## About KyndForm & Upstream HeyForm

**KyndForm** is an updated and expanded open-source distribution built on top of [HeyForm](https://github.com/heyform/heyform) (upstream base `v3.0.1`). 

While maintaining 100% backward compatibility with upstream HeyForm themes, conversational rendering, and form logic, KyndForm introduces key architectural enhancements, modern developer tooling, a headless REST engine, enhanced security layers, and streamlined cloud deployment for platforms like **Dokploy** and **Docker**.

---

## What's New in KyndForm (Additional Features & Enhancements)

### 1. Headless Form Engine & Dynamic Field Auto-Discovery
* **Headless REST Submission (`POST /f/:formId`, `POST /api/f/:formId`)**: Submit form responses directly via JSON or multipart `FormData` from any frontend (Astro, Next.js, mobile apps, static landing pages, or cURL)—no heavyweight runtime required.
* **Automatic Type Inference**: The engine automatically detects data types for incoming payload fields (`NUMBER`, `DATE`, `LONG_TEXT`, `SHORT_TEXT`, `FULL_NAME`).
* **Dynamic Schema Generation (`autoCreateFields`)**: When enabled, new fields posted by external clients are automatically added to the form's schema in MongoDB on the fly.
* **Hidden Query Fields Auto-Capture**: Automatically records and maps tracking query parameters (`utm_source`, `utm_medium`, `utm_campaign`, `ref`, `client_id`).
* **Branded Confirmation View**: Includes a customizable HTML success view template (`form-submitted.html`) for classic HTML form posts.

### 2. Multi-Layer Spam & Bot Protection
* **Honeypot Traps**: Seamlessly intercepts bot spam using hidden honeypot fields (`_gotcha`, `_honeypot`, `_bot`).
* **Submission Rate Limiting**: Dedicated client IP rate-limiting service (`SubmissionIpLimitService`) prevents brute-force submissions.
* **Captcha & Spam Classification**: Integrates Google reCAPTCHA v2/v3 and Akismet text spam filtering.

### 3. Outbound SSRF Hardening
* **Private Network Firewall (`outbound-url.ts`)**: Validates outbound webhook, OAuth, and avatar HTTP requests, blocking connections to internal loopback (`127.0.0.1`), Docker bridge subnets (`172.16.x.x`), and cloud instance metadata endpoints (`169.254.169.254`).

### 4. Developer Experience & UI Tooling
* **Headless Code Generator Modal**: Located in the **Share** tab (`HeadlessModal.tsx`), this modal instantly generates copy-paste snippets for:
  * Standard HTML Form `<form action="...">`
  * Modern JavaScript `fetch()` API
  * cURL terminal requests
* **JSON Form Schema Import**: Upload local `.json` form definition files in the template picker (`TemplatesModel.tsx`). Implemented via `FormService.importFromJSON(...)` to import questions, field layouts, logic trees, and themes in seconds.
* **Third-Party OAuth Services**: Native client app detail fetching and authorization code generators (`AppService.detail`, `AppService.authorizationCode`).

### 5. New Workspace Package: `@kyndform/answer-utils`
* A dedicated workspace package created specifically for submission parsing, answer normalization, field flattening, and secure HTML escaping.
* Backed by a full test suite with **113 passing unit tests**.

### 6. Production Architecture & Dokploy Readiness
* **Unified Single-Port Container (Port `8000`)**: The multi-stage Dockerfile builds both the React webapp and NestJS API, serving both on port `8000`. This simplifies reverse proxy configurations in Dokploy and Traefik (eliminating 502 Bad Gateway errors).
* **Smart Health Probe (`/health/ready`)**: Validates that both MongoDB and Redis connections are active before admitting ingress traffic.
* **Mongoose Document String Typing**: Resolves Mongoose `Document<string>` typing for nanoid primary keys (`_id: string`) across all models.
* **Single Root Lockfile Policy**: Replaced fragmented nested lockfiles with a single, reproducible root `pnpm-lock.yaml`.

### 7. Fork Preservation & Upstream Sync Tools
* **`pnpm run verify:fork`**: Automated 13-point test suite ensuring custom KyndForm features are never overwritten.
* **`pnpm run sync:upstream`**: Automated sync script with safety backup branches to pull upstream HeyForm updates cleanly.

---

## Monorepo Structure

```text
.
├── docs/                           (Launch guides, fork registry & upstream sync manuals)
├── scripts/                        (Integrity verification & upstream sync automation)
└── packages/
    ├── answer-utils                (@kyndform/answer-utils: submission validation & parsers) [NEW]
    ├── embed                       (@kyndform/embed: embeddable JavaScript client widget)
    ├── form-renderer               (@kyndform/form-renderer: conversational form UI renderer)
    ├── shared-types-enums          (@kyndform/shared-types-enums: shared TypeScript contracts)
    ├── utils                       (@kyndform/utils: shared utilities)
    ├── server                      (kyndform-server: NestJS backend API & Headless engine)
    └── webapp                      (kyndform-webapp: React form builder & admin dashboard)
```

For the complete list of modified and created files, see the [KyndForm Additions & File Tree](docs/KYNDFORM_ADDITIONS_AND_FILE_TREE.md).

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** >= 20
- **pnpm** >= 8
- **MongoDB** & **Redis**

### 2. Installation
```bash
git clone https://github.com/thewaqasPro/heyform.git kyndform
cd kyndform
pnpm install
```

### 3. Environment Configuration
Copy `.env.example` to create local environment files:
```bash
# Server environment
cp .env.example packages/server/.env.local

# Webapp environment
cp packages/webapp/.env.example packages/webapp/.env.local
```

### 4. Build & Verify
```bash
# Run fork integrity check
pnpm run verify:fork

# Type check all packages
pnpm run type-check

# Run unit tests
pnpm run test

# Build all packages
pnpm run build
```

### 5. Start Development Server
```bash
pnpm run dev
```
- **Webapp Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8000](http://localhost:8000)

---

## Deployment with Dokploy / Docker

KyndForm is pre-configured for Docker-based PaaS deployment (Dokploy, Coolify, Portainer).

1. In Dokploy, create an **Application** pointing to this repository (`branch: main`, build type: `Dockerfile`).
2. Set container port to **`8000`**.
3. Set health check path to **`/health/ready`**.
4. Configure environment variables following our [Dokploy Production Launch Plan](docs/DOKPLOY_LAUNCH_PLAN.md).

---

## Documentation Index

- 📘 [KyndForm Additions & File Tree](docs/KYNDFORM_ADDITIONS_AND_FILE_TREE.md) – Detailed catalog of custom features and exact file changes.
- 🚀 [Dokploy Launch Plan](docs/DOKPLOY_LAUNCH_PLAN.md) – Complete production deployment guide and environment variable reference.
- 🔄 [Upstream Sync Guide](docs/UPSTREAM_SYNC_GUIDE.md) – How to pull updates from `heyform/heyform` safely.
- 📑 [Fork Enhancements Registry](docs/FORK_ENHANCEMENTS_REGISTRY.md) – Architectural divergence catalog for developers and AI agents.

---

## License

KyndForm is open-source under the **GNU Affero General Public License v3.0 (AGPL-3.0)**, preserving upstream HeyForm licensing terms.
