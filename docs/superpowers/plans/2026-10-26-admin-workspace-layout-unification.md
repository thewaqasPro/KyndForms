# Admin Console & Workspace Layout Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the Admin Console (`/admin/status`, `/admin/settings`, `/admin/users`) with KyndForm's core workspace design system, adopting the responsive left sidebar, dark/light theme tokens, `hf-page-shell`, `hf-card`, and account controls so it feels completely native and consistent with Workspace Settings.

**Architecture:** Refactor `AdminLayout.tsx` from an isolated top-navbar into a persistent dual-zone layout mirroring `WorkspaceLayout`. The left pane provides an accessible sidebar with KyndForm branding, Admin Console navigation links (`Status`, `Settings`, `Users`), quick return to workspace, and the `WorkspaceAccount` profile drawer (with dark mode toggles). The right pane standardizes all admin pages on `hf-page-shell`, `hf-page-title`, `hf-card`, and `border-accent-light`.

**Tech Stack:** React 18, React Router v6, TailwindCSS, SCSS Design Tokens (`globals.scss`), Radix UI Dialog, Tabler Icons.

**Spec:** User architecture request to make all admin pages consistent with workspace settings and dark theme, keeping the sidebar and main layout.

## Global Constraints
- Must use existing KyndForm CSS utility classes: `hf-sidebar-surface`, `hf-sidebar-link`, `hf-sidebar-link-active`, `hf-page-shell`, `hf-page-title`, `hf-section-title`, `hf-card`.
- Dark mode must seamlessly sync using `document.documentElement.classList.contains('dark')` and CSS variables (`--hf-dashboard-border`, `--hf-dashboard-zone`, `--hf-dashboard-shadow`).
- Preserve role guard: only users with `isSystemAdmin: true` can access `/admin/*`.
- All verification gates (`verify:integrity`, `type-check`, `test`, `lint`) must pass with 0 errors.

## Review Focus
- **Dark Theme Contrast:** Cards, tables, and status pills must remain legible and aesthetically rich in both light and dark modes without hardcoded background colors that clash.
- **Mobile Responsiveness:** The admin sidebar must collapse into a mobile drawer with hamburger toggle on screens `< 1024px`, identical to `WorkspaceSidebarModal`.
- **Navigation State:** Active route must properly trigger `.hf-sidebar-link-active` with the colored left accent bar.
- **Workspace Navigation:** Admins must be able to switch back and forth between their workspace and admin console with a single click.
- **Session & Guard Persistence:** Logged-in admin state must be preserved without unnecessary re-fetching or flickering redirects.

---

### Task 1: Redesign `AdminLayout.tsx` with Persistent Sidebar & Workspace Shell

**Files:**
- Modify: `packages/webapp/src/pages/admin/AdminLayout.tsx`
- Test: Build & type-check in `packages/webapp`

**Interfaces:**
- Produces: `AdminLayout` wrapper component accepting `children` and optional title.
- Consumes: `useUserStore`, `useWorkspaceStore`, `WorkspaceAccount`, `Button`, Radix UI Dialog for mobile drawer.

- [ ] **Step 1: Write AdminSidebar component inside `AdminLayout.tsx`**
  Implement the standard `hf-sidebar-surface` left sidebar:
  - Top: KyndForm logo & app name, with an "Admin Console" shield badge.
  - Navigation section:
    - `System Status` (`/admin/status`, `IconActivity`)
    - `Platform Settings` (`/admin/settings`, `IconSettings`)
    - `User Governance` (`/admin/users`, `IconUsers`)
  - Divider: `border-accent-light`.
  - Return link: `← Back to Workspace` (`/workspace`, `IconArrowLeft`).
  - Bottom: `WorkspaceAccount` with avatar, dark mode switcher, and logout.

- [ ] **Step 2: Add Mobile Drawer to `AdminLayout.tsx`**
  Add mobile topbar with hamburger button (`IconMenu`) and Radix UI Dialog for `<lg` screen sizes, mirroring `WorkspaceSidebarModal`.

- [ ] **Step 3: Update Main Content Wrapper**
  Structure main content with:
  `className="bg-foreground flex flex-1 flex-col lg:min-w-0 lg:pl-64 min-h-screen"`
  `<div className="grow"><div className="hf-page-shell flex min-h-full flex-col">{children}</div></div>`

- [ ] **Step 4: Verify type-check passes**
  Run: `pnpm --filter ./packages/webapp type-check`
  Expected: Clean pass with 0 errors.

- [ ] **Step 5: Commit**
  ```bash
  git add packages/webapp/src/pages/admin/AdminLayout.tsx
  git commit -m "feat(webapp): restructure AdminLayout with persistent sidebar and workspace shell"
  ```

---

### Task 2: Harmonize System Status Page with Workspace Design Tokens

**Files:**
- Modify: `packages/webapp/src/pages/admin/SystemStatus.tsx`

**Interfaces:**
- Produces: Visual layout matching Workspace Settings (`hf-page-title`, `hf-card`, `border-accent-light`).
- Consumes: `AdminService.getSystemStatus()`, `Badge`, `Button.Ghost`.

- [ ] **Step 1: Update Page Header & Actions**
  Use `hf-page-title` for "System Status & Diagnostics" and `text-secondary` for description.
  Add border divider `border-accent-light my-6 w-full border-t`.

- [ ] **Step 2: Redesign Subsystem Cards with `hf-card` & Dark Mode Support**
  Replace ad-hoc Tailwind colors with:
  - `hf-card p-6 space-y-4`
  - Subtle dark-mode-compatible status badges.
  - Diagnostic metrics formatted with clean typography and monospace font for latencies.

- [ ] **Step 3: Verify build and type-check**
  Run: `pnpm --filter ./packages/webapp type-check`
  Expected: 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add packages/webapp/src/pages/admin/SystemStatus.tsx
  git commit -m "style(admin): harmonize SystemStatus with hf-card and dark theme tokens"
  ```

---

### Task 3: Harmonize Admin Settings & Users Pages with Workspace Layout

**Files:**
- Modify: `packages/webapp/src/pages/admin/Settings.tsx`
- Modify: `packages/webapp/src/pages/admin/Users.tsx`

**Interfaces:**
- Produces: Clean sections using `hf-section-title`, `border-accent-light`, `hf-card`, and `hf-table-shell`.

- [ ] **Step 1: Update `Settings.tsx` to match Workspace Settings sections**
  Format sections like `WorkspaceGeneral`:
  - `section` with `border-accent-light border-b pb-10`.
  - `h2 className="hf-section-title"`.
  - Input fields and switches matching `WorkspaceSettings`.

- [ ] **Step 2: Update `Users.tsx` table with `hf-card` and `hf-table-shell`**
  Wrap user list in `hf-card overflow-hidden` with `border-accent-light`.

- [ ] **Step 3: Verify webapp builds cleanly**
  Run: `pnpm --filter ./packages/webapp build`
  Expected: Clean build in < 10s.

- [ ] **Step 4: Commit**
  ```bash
  git add packages/webapp/src/pages/admin/
  git commit -m "style(admin): align Settings and Users pages with workspace design"
  ```

---

### Task 4: Add Admin Console Link to Workspace Sidebar

**Files:**
- Modify: `packages/webapp/src/layouts/Workspace/WorkspaceSidebar.tsx`

**Interfaces:**
- Consumes: `useUserStore.user.isSystemAdmin`

- [ ] **Step 1: Add conditional Admin Console link**
  In `WorkspaceSidebar.tsx`, when `user?.isSystemAdmin` is true, render an "Admin Console" link with `IconShield` under the main navigation group.

- [ ] **Step 2: Verify type-check passes**
  Run: `pnpm --filter ./packages/webapp type-check`
  Expected: 0 errors.

- [ ] **Step 3: Commit**
  ```bash
  git add packages/webapp/src/layouts/Workspace/WorkspaceSidebar.tsx
  git commit -m "feat(webapp): add Admin Console link in workspace sidebar for system admins"
  ```

---

### Task 5: Full Verification Protocol

- [ ] **Step 1: Verify architectural integrity**
  Run: `pnpm run verify:integrity`
  Expected: 14/14 checks pass.

- [ ] **Step 2: Type check entire workspace**
  Run: `pnpm run type-check`
  Expected: Clean pass across 7 packages.

- [ ] **Step 3: Run all unit tests**
  Run: `pnpm test`
  Expected: 331 tests pass.

- [ ] **Step 4: Verify linting**
  Run: `pnpm run lint`
  Expected: 0 errors.
