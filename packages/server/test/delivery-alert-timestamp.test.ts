import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

function testAlertTemplatesIncludeTimestamp() {
  const enTemplatePath = path.resolve(
    __dirname,
    '../resources/email-templates/integration_broken_alert.html'
  )
  const ptTemplatePath = path.resolve(
    __dirname,
    '../resources/email-templates/pt-br/integration_broken_alert.html'
  )

  const enContent = fs.readFileSync(enTemplatePath, 'utf8')
  assert.ok(
    enContent.includes('{timestamp}'),
    'English alert template must include {timestamp} placeholder'
  )
  assert.ok(
    enContent.includes('<strong>Time:</strong>'),
    'English alert template must display Time label'
  )

  const ptContent = fs.readFileSync(ptTemplatePath, 'utf8')
  assert.ok(
    ptContent.includes('{timestamp}'),
    'PT-BR alert template must include {timestamp} placeholder'
  )
  assert.ok(
    ptContent.includes('<strong>Horário:</strong>'),
    'PT-BR alert template must display Horário label'
  )
}

async function run() {
  testAlertTemplatesIncludeTimestamp()
  console.log('delivery-alert-timestamp test passed!')
}

if (require.main === module) {
  run().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
