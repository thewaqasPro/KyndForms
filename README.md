<br /><br />

<div align="center">
  <h1 align="center">
    <b>KyndForm</b>
  </h1>
  <p><b>Next-generation open-source conversational, classic, and headless form platform</b></p>
  <p>A standalone, production-hardened form platform featuring dual layout rendering, a headless REST submission engine, dynamic schema discovery, project-scoped cloud media management, and enterprise deployment tooling.</p>
</div>

<img src="./assets/images/screenshot.png" alt="KyndForm" />

---

## About KyndForm

**KyndForm** is a modern, standalone open-source form builder and submission engine.

Originally evolved from an open-source form base ([HeyForm](https://github.com/heyform/heyform) v3.0.1), KyndForm has been **completely detached into an independent, standalone application with zero upstream dependency**. All architecture, visual themes, headless APIs, media management, and integrations are developed and maintained directly within this repository.

---

## Key Features & Architecture

### 1. Dual Form Layout Modes
* **Conversational Mode**: An interactive, single-question flow inspired by Typeform with keyboard hotkeys, smooth transitions, and inline accessible question counter badges (`1`, `2` with `aria-label="Question 1 of 10"`).
* **Classic Form Mode**: A clean, continuous all-in-one form layout designed for traditional surveys, multi-column inputs, business applications, and registration forms.

### 2. Headless Form Engine & Dynamic Field Auto-Discovery
* **Headless REST Endpoints (`POST /f/:formId`, `POST /api/f/:formId`)**: Submit responses directly via JSON or multipart `FormData` from any frontend—Next.js, Astro.js, Remix, mobile apps, or static landing pages—without loading the KyndForm runtime script.
* **Automatic Type Inference**: Auto-detects data types for incoming payload keys (`NUMBER`, `DATE`, `LONG_TEXT`, `SHORT_TEXT`, `FULL_NAME`).
* **Dynamic Schema Generation (`autoCreateFields`)**: When enabled, new fields posted by external clients are automatically added to the form's schema in MongoDB on the fly.
* **Hidden Tracking Capture**: Automatically captures and records UTM and marketing attribution parameters (`utm_source`, `utm_medium`, `utm_campaign`, `ref`, `client_id`).
* **Custom Confirmation Template**: Customizable HTML success view (`form-submitted.html`) for standard browser `<form>` submissions.

### 3. Project-Scoped Media Library & S3 Reuse
* **Dedicated Media Library**: Form creators can upload images directly to AWS S3 / MinIO or choose from Unsplash.
* **Asset Reuse Across Forms**: Once uploaded, images are indexed per project and workspace, allowing instant one-click reuse across any other form in the project without re-uploading.

### 4. Self-Hosted First-Party Embed Widget
* **Zero External CDN Dependencies**: The embed library is built and served directly by the KyndForm host (`/static/embed.js` and `/embed.js`), eliminating third-party unpkg outages.
* **Multiple Embed Styles**: Supports Standard inline embeds, Full-page embeds, Popup buttons, and Modal overlays.

### 5. Developer Experience & Integration Snippets
* **Syntax-Highlighted Integration Modals**: Built-in interactive code editor blocks with syntax highlighting and instant copying for:
  * Static HTML Form `<form action="...">`
  * Next.js / React fetch implementation
  * Astro.js integration
  * Terminal cURL requests

### 6. Enterprise Bot & SSRF Security
* **Outbound SSRF Firewall (`outbound-url.ts`)**: Validates webhook, OAuth, and avatar HTTP requests, blocking connections to internal loopback (`127.0.0.1`), Docker subnets (`172.16.x.x`), and cloud instance metadata endpoints (`169.254.169.254`).
* **Multi-Layer Bot Defense**: Automated honeypot traps (`_gotcha`, `_honeypot`, `_bot`), client IP submission limits, and Google reCAPTCHA v2/v3 support.

### 7. Production Deployment & Dokploy Readiness
* **Unified Single-Port Container (Port `8000`)**: The multi-stage Dockerfile bundles both the React webapp and NestJS API into an optimized production runner on port `8000`.
* **Smart Health Probes (`/health/ready`)**: Validates that MongoDB and Redis connections are live before routing ingress traffic.
* **Consolidated Root Lockfile**: Strict single-lockfile policy (`pnpm-lock.yaml`) preventing dependency drift across the monorepo.

---

## Monorepo Packages

```text
.
├── docs/                           (Architecture specs, Dokploy guides & security manuals)
├── scripts/                        (Integrity verification & maintenance utilities)
└── packages/
    ├── answer-utils                (@kyndform/answer-utils: standalone validation & answer parsers)
    ├── embed                       (@kyndform/embed: embeddable client JavaScript widget)
    ├── form-renderer               (@kyndform/form-renderer: conversational & classic form UI engine)
    ├── shared-types-enums          (@kyndform/shared-types-enums: shared TypeScript contracts & enums)
    ├── utils                       (@kyndform/utils: shared utilities & helpers)
    ├── server                      (kyndform-server: NestJS backend API & headless submission engine)
    └── webapp                      (kyndform-webapp: React form builder & management dashboard)
```

---

## Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** >= 20
- **pnpm** >= 8
- **MongoDB** >= 6.0
- **Redis** >= 6.0

### 2. Installation
```bash
git clone https://github.com/thewaqasPro/KyndForms.git kyndform
cd kyndform
pnpm install
```

### 3. Environment Setup
Create environment files from the provided templates:
```bash
# Server configuration
cp .env.example packages/server/.env.local

# Webapp configuration
cp packages/webapp/.env.example packages/webapp/.env.local
```

### 4. Build & Verify
```bash
# Verify architectural integrity
pnpm run verify:integrity

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
- **Webapp Form Builder:** [http://localhost:3000](http://localhost:3000)
- **Backend API & Embeds:** [http://localhost:8000](http://localhost:8000)

---

## Deployment with Dokploy / Docker

KyndForm is pre-configured for Docker-based PaaS deployment (Dokploy, Coolify, Portainer).

1. In Dokploy, create an **Application** pointing to this repository (`branch: main`, build type: `Dockerfile`).
2. Set container port to **`8000`**.
3. Set health check path to **`/health/ready`**.
4. Configure environment variables following our [Dokploy Production Launch Plan](docs/DOKPLOY_LAUNCH_PLAN.md).

---

## Documentation Index

- 📘 [KyndForm Architecture Specification](docs/KYNDFORM_ARCHITECTURE_SPEC.md) – Detailed architectural catalog of all core modules and extension patterns.
- 🚀 [Dokploy Launch Plan](docs/DOKPLOY_LAUNCH_PLAN.md) – Complete production deployment guide and environment variable reference.
- 🏗️ [Standalone Architecture Guide](docs/STANDALONE_ARCHITECTURE_GUIDE.md) – Development guidelines, package boundaries, and release workflow.
- 📑 [KyndForm Additions & File Tree](docs/KYNDFORM_ADDITIONS_AND_FILE_TREE.md) – Historical catalog of enhancements added across packages.

---

## License

KyndForm is open-source under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
