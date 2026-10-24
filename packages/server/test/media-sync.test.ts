import * as assert from 'assert'

import { MediaSyncService } from '../src/service/media-sync.service'

async function testExtractImageUrls() {
  const syncService = new MediaSyncService({} as any, {} as any)

  const sampleForm = {
    fields: [
      {
        id: 'q1',
        title: 'Choose ring',
        properties: {
          choices: [
            {
              id: 'c1',
              label: 'Oval',
              image: 'https://s3.kyndstudio.com/forms-kyndstudio/ring_oval.png'
            },
            {
              id: 'c2',
              label: 'Round',
              image: '/static/upload/ring_round.png'
            }
          ]
        }
      }
    ],
    themeSettings: {
      theme: {
        background: 'https://images.unsplash.com/photo-1234.jpg'
      }
    }
  }

  const urls = syncService.extractImageUrls(sampleForm)
  assert.ok(urls.includes('https://s3.kyndstudio.com/forms-kyndstudio/ring_oval.png'))
  assert.ok(urls.includes('/static/upload/ring_round.png'))
  assert.ok(urls.includes('https://images.unsplash.com/photo-1234.jpg'))
}

async function testExtractKeyFromUrl() {
  const syncService = new MediaSyncService({} as any, {} as any)

  assert.strictEqual(syncService.extractKeyFromUrl('/static/upload/image_123.png'), 'image_123.png')
  assert.strictEqual(
    syncService.extractKeyFromUrl('https://s3.kyndstudio.com/forms-kyndstudio/custom_asset.webp'),
    'custom_asset.webp'
  )
}

async function run() {
  await testExtractImageUrls()
  await testExtractKeyFromUrl()
  console.log('Media sync tests passed successfully.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
