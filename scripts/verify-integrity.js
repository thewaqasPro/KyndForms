#!/usr/bin/env node
/**
 * KyndForm Architecture Integrity Verification
 *
 * Verifies that all custom KyndForm core enhancements and architectural features
 * remain present and fully intact.
 * Run:
 *   pnpm run verify:integrity
 */

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')

let errors = []
let passedChecks = 0

function check(description, testFn) {
  try {
    const result = testFn()
    if (result === false) {
      errors.push(`FAIL: ${description}`)
    } else {
      passedChecks++
    }
  } catch (err) {
    errors.push(`FAIL: ${description} (Error: ${err.message})`)
  }
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT_DIR, relPath))
}

function fileContains(relPath, snippet) {
  const fullPath = path.join(ROOT_DIR, relPath)
  if (!fs.existsSync(fullPath)) return false
  const content = fs.readFileSync(fullPath, 'utf8')
  return content.includes(snippet)
}

console.log('\n🔍 Verifying KyndForm Architecture Integrity...\n')

// 1. Single Root Lockfile Policy
check('No nested lockfiles in sub-packages', () => {
  const nestedLockfiles = [
    'packages/server/pnpm-lock.yaml',
    'packages/webapp/pnpm-lock.yaml',
    'packages/embed/pnpm-lock.yaml',
    'packages/form-renderer/pnpm-lock.yaml',
    'packages/answer-utils/pnpm-lock.yaml'
  ]
  const found = nestedLockfiles.filter(f => fileExists(f))
  if (found.length > 0) {
    throw new Error(
      `Found nested lockfiles: ${found.join(', ')}. Consolidated root lockfile policy violated.`
    )
  }
  return true
})

// 2. Workspace Package: @kyndform/answer-utils
check('Workspace package packages/answer-utils exists and is configured', () => {
  return (
    fileExists('packages/answer-utils/package.json') &&
    fileContains('packages/answer-utils/package.json', '@kyndform/answer-utils')
  )
})

// 3. Headless Form Engine (packages/server)
check(
  'Headless form controller exists (packages/server/src/controller/headless-form.controller.ts)',
  () => {
    return fileExists('packages/server/src/controller/headless-form.controller.ts')
  }
)

check('Headless form controller exported in server controller/index.ts', () => {
  return fileContains('packages/server/src/controller/index.ts', 'headless-form.controller')
})

check('Headless form HTML template exists (packages/server/view/form-submitted.html)', () => {
  return fileExists('packages/server/view/form-submitted.html')
})

// 4. Outbound URL & SSRF Hardening
check('SSRF hardening utility exists (packages/server/src/utils/outbound-url.ts)', () => {
  return fileExists('packages/server/src/utils/outbound-url.ts')
})

// 5. Webapp JSON Import Feature
check('FormService.importFromJSON exists in packages/webapp/src/services/form.ts', () => {
  return fileContains('packages/webapp/src/services/form.ts', 'importFromJSON')
})

check(
  'JSON template file upload exists in packages/webapp/src/layouts/Workspace/TemplatesModel.tsx',
  () => {
    return fileContains(
      'packages/webapp/src/layouts/Workspace/TemplatesModel.tsx',
      'importFromJSON'
    )
  }
)

// 6. OAuth App Service
check(
  'AppService.detail and authorizationCode exist in packages/webapp/src/services/app.ts',
  () => {
    return (
      fileContains('packages/webapp/src/services/app.ts', 'detail') &&
      fileContains('packages/webapp/src/services/app.ts', 'authorizationCode')
    )
  }
)

// 7. Headless Share Modal & CodeBlock in Webapp
check(
  'Headless share modal exists in packages/webapp/src/pages/form/Share/HeadlessModal.tsx',
  () => {
    return fileExists('packages/webapp/src/pages/form/Share/HeadlessModal.tsx')
  }
)

check('Headless share modal is mounted in packages/webapp/src/pages/form/Share/index.tsx', () => {
  return fileContains('packages/webapp/src/pages/form/Share/index.tsx', 'HeadlessModal')
})

check('CodeBlock component exists in packages/webapp/src/components/CodeBlock.tsx', () => {
  return fileExists('packages/webapp/src/components/CodeBlock.tsx')
})

// 8. Documentation & Agent Rules
check('AGENTS.md rules exist', () => {
  return fileExists('AGENTS.md')
})

check('Architecture specification document exists', () => {
  return fileExists('docs/KYNDFORM_ARCHITECTURE_SPEC.md')
})

// Summary
if (errors.length > 0) {
  console.error('\n❌ Architecture integrity check FAILED:')
  errors.forEach(err => console.error(`  - ${err}`))
  console.error(
    '\nPlease consult docs/KYNDFORM_ARCHITECTURE_SPEC.md to restore missing features.\n'
  )
  process.exit(1)
} else {
  console.log(
    `✅ All ${passedChecks} architecture integrity checks PASSED! KyndForm core features are fully intact.\n`
  )
  process.exit(0)
}
