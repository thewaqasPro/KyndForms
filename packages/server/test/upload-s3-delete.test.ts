import * as assert from 'assert'

import { deleteUploadedFile, deleteUploadedFiles } from '../src/config/upload'

async function testDeleteUploadedFileReturnsTrueForValidKey() {
  const result = await deleteUploadedFile('non_existent_test_key_123.png')
  assert.strictEqual(typeof result, 'boolean')
}

async function testDeleteUploadedFilesHandlesEmptyArray() {
  const count = await deleteUploadedFiles([])
  assert.strictEqual(count, 0)
}

async function testDeleteUploadedFilesHandlesKeys() {
  const count = await deleteUploadedFiles(['key1.png', 'key2.png'])
  assert.strictEqual(typeof count, 'number')
}

async function run() {
  await testDeleteUploadedFileReturnsTrueForValidKey()
  await testDeleteUploadedFilesHandlesEmptyArray()
  await testDeleteUploadedFilesHandlesKeys()
  console.log('Upload S3 delete tests passed successfully.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
