# Project-Scoped Media Library and S3 Image Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a project- and workspace-scoped Media Library tab inside the KyndForm `ImagePicker`, enabling users to reselect previously uploaded S3 images with automatic S3 object tracking and cascading S3/database cleanup on project or workspace deletion.

**Architecture:** 
1. Mongoose `MediaModel` records every uploaded image with `teamId`, `projectId`, `formId`, `filename`, `key`, `url`, `size`, and `mimeType`.
2. `UploadController` automatically registers new uploads into `MediaModel` when authenticated.
3. S3 deletion helpers (`deleteUploadedFile`, `deleteUploadedFiles`) execute S3 `DeleteObjectCommand` / `DeleteObjectsCommand` (with local filesystem fallback).
4. GraphQL endpoints `medias` (query) and `deleteMedia` (mutation) provide project-scoped image retrieval and deletion.
5. Cascading deletion is wired into `DeleteProjectResolver` and `DissolveTeamResolver` to remove orphaned S3 assets whenever a project or workspace is dissolved.
6. A new `MediaPicker` component is mounted as a "Library" tab in `ImagePicker.tsx`, enabled across Picture Choice, Question Cover/Layout, Theme Customize, and Form Share settings.

**Tech Stack:** NestJS, `@nestjs/mongoose`, `@aws-sdk/client-s3`, GraphQL (`@nestjs/graphql`), React, Radix UI, TailwindCSS, TypeScript.

**Spec:** User requirement to reuse uploaded S3 images, keep images strictly scoped per project/workspace, and clean up S3 objects upon project or workspace deletion.

## Global Constraints
- Preserve all existing KyndForm enhancements per [AGENTS.md](file:///Users/waqas/Development/2026/kyndForms/AGENTS.md).
- Single root `pnpm-lock.yaml` policy — do not run `pnpm install` in subpackages.
- Mandatory verification: `pnpm type-check`, `pnpm test`, and `pnpm lint` must all exit with code 0 before task completion.
- Rebranding integrity: Keep KyndForm naming and conventions intact.

## Review Focus
1. **Scope Isolation**: An image uploaded in Project A must not bleed into Project B unless explicitly queried across the workspace.
2. **S3 Orphan Prevention**: Deleting an image, project, or workspace must purge the actual S3 object (`Key`), not just the MongoDB document.
3. **Graceful Storage Fallback**: Deletion and retrieval must work identically whether running with AWS S3 configured or local disk fallback.
4. **Historical Asset Backfill**: Images already in forms (like "Find Your Dream Ring") should be indexed into the media library via a sync helper so the user's existing pictures appear immediately.
5. **Responsive Image Grid**: The Media Library tab must handle varying aspect ratios, load thumbnails smoothly with skeletons, and support single-click selection.

---

### Task 1: S3 File Deletion Helpers & Upload Configuration

**Files:**
- Modify: `packages/server/src/config/upload/index.ts`
- Test: `packages/server/test/upload-s3-delete.test.ts`

**Interfaces:**
- Produces: `deleteUploadedFile(key: string): Promise<boolean>`
- Produces: `deleteUploadedFiles(keys: string[]): Promise<number>`

- [ ] **Step 1: Write unit tests for S3 and local file deletion**
Create `packages/server/test/upload-s3-delete.test.ts` validating that `deleteUploadedFile` and `deleteUploadedFiles` handle both S3 deletion (mocked `DeleteObjectCommand` / `DeleteObjectsCommand`) and local filesystem unlink cleanly without throwing on missing files.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter kyndform-server test:e2e` or run test runner on `upload-s3-delete.test.ts`.
Expected: FAIL (functions not exported).

- [ ] **Step 3: Implement `deleteUploadedFile` and `deleteUploadedFiles` in `packages/server/src/config/upload/index.ts`**
Import `DeleteObjectCommand` and `DeleteObjectsCommand` from `@aws-sdk/client-s3`. If `isS3Configured()` is true, execute S3 commands using `S3_BUCKET`. If not, delete files from `UPLOAD_DIR` via `fs.unlink`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter kyndform-server test:e2e`.
Expected: PASS.

- [ ] **Step 5: Commit changes**
```bash
git add packages/server/src/config/upload/index.ts packages/server/test/upload-s3-delete.test.ts
git commit -m "feat(server): add s3 and local upload deletion helpers"
```

---

### Task 2: Media Model and Database Schema

**Files:**
- Create: `packages/server/src/model/media.model.ts`
- Modify: `packages/server/src/model/index.ts`
- Modify: `packages/server/src/model/module.ts`
- Modify: `packages/shared-types-enums/src/models.ts`

**Interfaces:**
- Produces: `MediaModel` mongoose document and `MediaSchema` with compound indexes on `{ teamId: 1, projectId: 1, createdAt: -1 }`.

- [ ] **Step 1: Define `MediaModel` class and schema**
In `packages/server/src/model/media.model.ts`:
```typescript
@Schema({ timestamps: true })
export class MediaModel extends Document {
  @Prop({ required: true, index: true })
  teamId: string

  @Prop({ required: true, index: true })
  projectId: string

  @Prop({ index: true })
  formId?: string

  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true })
  filename: string

  @Prop({ required: true })
  key: string

  @Prop({ required: true })
  url: string

  @Prop({ required: true })
  size: number

  @Prop({ required: true })
  mimeType: string
}
```
Register compound index: `MediaSchema.index({ teamId: 1, projectId: 1, createdAt: -1 })`.

- [ ] **Step 2: Export from `model/index.ts` and register in `model/module.ts`**
Add `MediaModel` and `MediaSchema` to Mongoose module imports.

- [ ] **Step 3: Run type check to verify schema compiles**
Run: `pnpm --filter kyndform-server type-check`.
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit changes**
```bash
git add packages/server/src/model/media.model.ts packages/server/src/model/index.ts packages/server/src/model/module.ts
git commit -m "feat(server): define project-scoped MediaModel schema"
```

---

### Task 3: Media Service and Auto-Registration in UploadController

**Files:**
- Create: `packages/server/src/service/media.service.ts`
- Modify: `packages/server/src/service/index.ts`
- Modify: `packages/server/src/service/module.ts`
- Modify: `packages/server/src/controller/upload.controller.ts`
- Modify: `packages/webapp/src/services/upload.ts`

**Interfaces:**
- Produces: `MediaService.create(data: Partial<MediaModel>): Promise<MediaModel>`
- Produces: `MediaService.findAll(params: { teamId: string; projectId?: string; keyword?: string; page?: number; limit?: number })`
- Produces: `MediaService.delete(id: string, teamId: string): Promise<boolean>`
- Produces: `MediaService.deleteByProject(projectId: string): Promise<number>`
- Produces: `MediaService.deleteByTeam(teamId: string): Promise<number>`

- [ ] **Step 1: Implement `MediaService` in `packages/server/src/service/media.service.ts`**
Provide pagination, keyword regex matching on `filename`, S3 deletion coordination via `deleteUploadedFile` / `deleteUploadedFiles`, and deletion methods for single media, project-wide media, and team-wide media.

- [ ] **Step 2: Update `UploadController.ts` to capture project context and persist Media**
In `UploadController.index()`:
Extract `workspaceId` (or `teamId`), `projectId`, and `formId` from request headers `x-kyndform-workspace-id`, `x-kyndform-project-id`, `x-kyndform-form-id`. If `formId` is present, resolve `form` to auto-fill `projectId` and `teamId`. When an authenticated user uploads an image, call `mediaService.create(...)`.

- [ ] **Step 3: Update `packages/webapp/src/services/upload.ts`**
Add `workspaceId` and `projectId` to `UploadContext` interface and include them in the headers sent by `UploadService.upload()`.

- [ ] **Step 4: Verify type-check passes**
Run: `pnpm type-check`.
Expected: Exit code 0.

- [ ] **Step 5: Commit changes**
```bash
git add packages/server/src/service/media.service.ts packages/server/src/service/index.ts packages/server/src/service/module.ts packages/server/src/controller/upload.controller.ts packages/webapp/src/services/upload.ts
git commit -m "feat(server): implement media service and auto-persist uploaded assets"
```

---

### Task 4: Cascading S3 and Database Deletion on Project and Workspace Dissolution

**Files:**
- Modify: `packages/server/src/resolver/project/delete-project.resolver.ts`
- Modify: `packages/server/src/resolver/team/dissolve-team.resolver.ts`
- Test: `packages/server/test/deletion-cascade-security.test.ts`

**Interfaces:**
- Consumes: `MediaService.deleteByProject(projectId: string)`
- Consumes: `MediaService.deleteByTeam(teamId: string)`

- [ ] **Step 1: Update `DeleteProjectResolver` to purge project media**
In `deleteProject()` in `packages/server/src/resolver/project/delete-project.resolver.ts`:
Inject `MediaService` and call `await this.mediaService.deleteByProject(project.id)` when deleting the project.

- [ ] **Step 2: Update `DissolveTeamResolver` to purge workspace media**
In `dissolveTeam()` in `packages/server/src/resolver/team/dissolve-team.resolver.ts`:
Inject `MediaService` and call `await this.mediaService.deleteByTeam(team.id)` when dissolving the team.

- [ ] **Step 3: Update and run cascade security unit tests**
Add assertions in `packages/server/test/deletion-cascade-security.test.ts` confirming `mediaService.deleteByProject` and `mediaService.deleteByTeam` are triggered during project and team dissolution.
Run: `pnpm --filter kyndform-server test:e2e`.
Expected: PASS.

- [ ] **Step 4: Commit changes**
```bash
git add packages/server/src/resolver/project/delete-project.resolver.ts packages/server/src/resolver/team/dissolve-team.resolver.ts packages/server/test/deletion-cascade-security.test.ts
git commit -m "feat(server): add cascading s3 media purge to project and team deletion"
```

---

### Task 5: GraphQL Resolvers for Media Query & Delete

**Files:**
- Create: `packages/server/src/common/graphql/media.graphql.ts`
- Create: `packages/server/src/resolver/media/media-list.resolver.ts`
- Create: `packages/server/src/resolver/media/delete-media.resolver.ts`
- Modify: `packages/server/src/resolver/index.ts`
- Modify: `packages/server/src/resolver/module.ts`
- Modify: `packages/webapp/src/consts/gql.ts`
- Modify: `packages/webapp/src/services/media.ts`

**Interfaces:**
- Produces: Query `medias(input: MediaListInput!): [MediaType!]!`
- Produces: Mutation `deleteMedia(id: String!): Boolean!`

- [ ] **Step 1: Define GraphQL types and inputs**
Create `packages/server/src/common/graphql/media.graphql.ts` with `MediaType` object type and `MediaListInput` input type (`teamId`, `projectId`, `keyword`, `page`, `limit`).

- [ ] **Step 2: Implement `MediaListResolver` and `DeleteMediaResolver`**
Add resolvers protected by `@Auth()` and `@ProjectGuard()` or `@TeamGuard()`.
- `medias`: Returns project-scoped uploaded media.
- `deleteMedia`: Deletes media document and purges the S3 file.

- [ ] **Step 3: Define frontend GraphQL queries and `MediaService`**
In `packages/webapp/src/consts/gql.ts`:
Add `MEDIAS_GQL` and `DELETE_MEDIA_GQL`.
In `packages/webapp/src/services/media.ts`:
Provide `MediaService.list(input)` and `MediaService.delete(id)`.

- [ ] **Step 4: Verify type-check passes**
Run: `pnpm type-check`.
Expected: Exit code 0.

- [ ] **Step 5: Commit changes**
```bash
git add packages/server/src/common/graphql/media.graphql.ts packages/server/src/resolver/media/ packages/webapp/src/services/media.ts packages/webapp/src/consts/gql.ts
git commit -m "feat: implement graphql query and mutation for media library"
```

---

### Task 6: Historical Asset Sync Helper (Import Existing Images)

**Files:**
- Create: `packages/server/src/service/media-sync.service.ts`
- Test: `packages/server/test/media-sync.test.ts`

**Interfaces:**
- Produces: `MediaSyncService.syncFromExistingForms(): Promise<{ scannedForms: number; importedAssets: number }>`

- [ ] **Step 1: Implement `MediaSyncService`**
Iterate through existing forms in MongoDB. Inspect `form.fields` (choices with images, questions with mediaUrl, cover images, theme background). If an image URL belongs to S3 (or local upload) and is not yet in `MediaModel`, register it with the form's `teamId`, `projectId`, and `formId`.

- [ ] **Step 2: Add migration / CLI trigger or startup hook**
Allow sync to run automatically on server start or via migration script so existing images (such as ring shape diagrams and diamond photos) appear immediately in the library.

- [ ] **Step 3: Run type-check & test**
Run: `pnpm type-check`.
Expected: PASS.

- [ ] **Step 4: Commit changes**
```bash
git add packages/server/src/service/media-sync.service.ts
git commit -m "feat(server): add historical asset backfill for existing form images"
```

---

### Task 7: Frontend `MediaPicker` Component and `ImagePicker` "Library" Tab

**Files:**
- Create: `packages/webapp/src/components/MediaPicker.tsx`
- Modify: `packages/webapp/src/components/ImagePicker.tsx`
- Modify: `packages/webapp/src/components/index.ts`
- Modify: `packages/webapp/src/locales/en.json` (and other locale files)
- Modify: `packages/webapp/src/pages/form/Builder/Compose/Blocks/PictureChoice.tsx`
- Modify: `packages/webapp/src/pages/form/Builder/RightSidebar/Question/CoverAndLayout.tsx`
- Modify: `packages/webapp/src/pages/form/Builder/RightSidebar/Design/Customize.tsx`
- Modify: `packages/webapp/src/pages/form/Share/LinkSettings.tsx`

**Interfaces:**
- Produces: `<MediaPicker projectId={projectId} workspaceId={workspaceId} onChange={onChange} />`
- Produces: `ImagePicker` tab `library` ("Library" / "Media Library")

- [ ] **Step 1: Implement `MediaPicker.tsx`**
Create `packages/webapp/src/components/MediaPicker.tsx`:
- Search bar to filter by filename.
- Project-scoped toggle / filter ("Current Project" vs "Workspace Library").
- Responsive thumbnail grid (`w-1/2 sm:w-1/3 lg:w-1/4`).
- Thumbnail card with image preview, filename, file size, and delete button with confirmation tooltip.
- Click image to trigger `onChange(image.url)` and select it immediately.
- Skeleton loader and empty state ("No images uploaded in this project yet. Upload an image to start your project library.").

- [ ] **Step 2: Add `library` tab to `ImagePicker.tsx`**
Update `TabType` in `packages/webapp/src/components/ImagePicker.tsx`:
```typescript
type TabType = 'image' | 'library' | 'unsplash' | 'gradient'
```
Wire `tabConfigs.library` to pass `projectId` and `workspaceId` into `MediaPicker`.

- [ ] **Step 3: Update builder call sites**
In `PictureChoice.tsx`, `CoverAndLayout.tsx`, `Customize.tsx`, and `LinkSettings.tsx`:
Pass `tabs={['image', 'library', 'unsplash']}` and pass `tabConfigs={{ library: { projectId, workspaceId } }}`.

- [ ] **Step 4: Add localization strings**
In `packages/webapp/src/locales/*.json`:
Add strings for `components.imagePicker.library.title` ("Library"), `search` ("Search project images..."), `empty` ("No images in this project yet"), and `deleteConfirm` ("Delete image").

- [ ] **Step 5: Run workspace verification**
Run `pnpm type-check`, `pnpm test`, and `pnpm lint`.
Expected: Exit code 0 across all packages.

- [ ] **Step 6: Commit changes**
```bash
git add packages/webapp/src/components/MediaPicker.tsx packages/webapp/src/components/ImagePicker.tsx packages/webapp/src/locales/ packages/webapp/src/pages/form/
git commit -m "feat(webapp): add project-scoped Library tab to ImagePicker"
```

---

### Task 8: End-to-End Verification & Browser Validation

**Files:** None (testing & verification only)

- [ ] **Step 1: Verify full workspace build and type safety**
Run:
```bash
pnpm type-check
pnpm test
pnpm lint
pnpm --filter ./packages/webapp build
pnpm --filter @kyndform/form-renderer build
```
Confirm all exit codes are 0.

- [ ] **Step 2: Validate in Browser**
- Navigate to builder for form `dVljkyBz`.
- Click on Picture Choice -> Add Image -> observe the new **Library** tab.
- Click **Library** -> verify existing ring/stone images show up.
- Select an existing image -> verify it applies immediately to the choice.
- Upload a new image -> verify it gets stored in S3 and immediately appears in the Project Library.
- Switch to a different project -> verify images from the first project do not display in the second project's library.
- Delete an image from Library -> confirm removal from both S3 and UI.
