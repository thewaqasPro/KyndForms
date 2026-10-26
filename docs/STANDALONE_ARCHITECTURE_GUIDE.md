# Standalone Architecture & Development Guide

> **Objective:** Comprehensive guide for developing, extending, testing, and deploying **KyndForm** as a completely independent, standalone application.

---

## 1. Standalone Repository Philosophy

KyndForm operates as a fully independent, standalone application:
- **No Upstream Dependency**: All features, layouts, API endpoints, themes, and security patches are developed and maintained natively within this codebase.
- **Independent Versioning & Releases**: KyndForm releases follow its own roadmap and versioning cycle.
- **Direct GitHub Repository**: Hosted at `https://github.com/thewaqasPro/KyndForms.git`.

---

## 2. Monorepo Package Topology

KyndForm is organized as a unified monorepo managed with `pnpm` workspaces:

```text
packages/
├── answer-utils           -> Standalone submission validation, HTML sanitization, and logic rules
├── embed                  -> Client embed library (compiled to /static/embed.js)
├── form-renderer          -> Conversational and Classic form UI engine
├── server                 -> NestJS backend, GraphQL API, MongoDB models, and Headless submission engine
├── shared-types-enums     -> Core TypeScript contracts, interfaces, and enums shared across packages
├── utils                  -> Shared helpers, string manipulation, and cryptographic utilities
└── webapp                 -> React form builder, management dashboard, and template library
```

### Dependency Rules:
1. Subpackages depend on each other via `workspace:*`.
2. A single root `pnpm-lock.yaml` is maintained. Subpackage directories must never contain isolated lockfiles.
3. When building the entire workspace, run `pnpm build:packages` followed by `pnpm build:server` and `pnpm build:webapp`.

---

## 3. Extending the Application

### Adding New Question Types / Form Fields:
1. Define the enum value in `packages/shared-types-enums/src/form.ts` (`FieldKindEnum`).
2. Implement validation and parsing rules in `packages/answer-utils/src/`.
3. Add UI rendering components in `packages/form-renderer/src/fields/` and `packages/form-renderer/src/views/Classic/`.
4. Register builder compose controls in `packages/webapp/src/pages/form/Builder/`.

### Adding New Integrations or Apps:
1. Create a dedicated connector file in `packages/server/src/apps/<integration-name>.ts`.
2. Implement the standard dispatch pattern with payload limiting and SSRF protection.
3. Expose configuration settings in `packages/webapp/src/pages/form/Integrations/`.

### Serving Static & Embed Assets:
1. The embed bundle is built by `@kyndform/embed` (`rollup -c`).
2. Its post-build script automatically synchronizes `dist/index.umd.js` into:
   - `packages/webapp/public/static/embed.js` (served in development via Vite)
   - `packages/server/static/embed.js` (served in production via NestJS static asset middleware)

---

## 4. Verification Protocol

Before committing any modifications or deploying new versions, run the full verification suite:

```bash
# 1. Architecture integrity check
pnpm run verify:integrity

# 2. Monorepo type check
pnpm run type-check

# 3. Unit test suites
pnpm run test

# 4. Monorepo linter
pnpm run lint
```
