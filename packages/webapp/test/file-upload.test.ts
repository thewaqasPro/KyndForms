import * as assert from 'assert'
import { describe, it } from 'vitest'

import {
  getFileUploadValue,
  isAllowedUrlOrigin,
  isHttpUrl,
  isTrustedStripeReceiptUrl
} from '../src/utils/file-upload'

describe('file-upload', () => {
  it('normalizes current and legacy file values', () => {
    assert.deepStrictEqual(getFileUploadValue('https://forms.example.com/static/upload/file-id'), {
      filename: 'Attachment',
      url: 'https://forms.example.com/static/upload/file-id?attname=Attachment'
    })
    assert.deepStrictEqual(
      getFileUploadValue({
        filename: 'report.pdf',
        url: 'https://forms.example.com/static/upload/file-id?token=abc'
      }),
      {
        filename: 'report.pdf',
        url: 'https://forms.example.com/static/upload/file-id?token=abc&attname=report.pdf'
      }
    )
    assert.deepStrictEqual(
      getFileUploadValue({
        filename: 'report.pdf',
        urlPrefix: 'https://cdn.example.com/uploads/',
        key: '/file-id'
      }),
      {
        filename: 'report.pdf',
        url: 'https://cdn.example.com/uploads/file-id?attname=report.pdf'
      }
    )
    assert.deepStrictEqual(
      getFileUploadValue({
        filename: 'report.pdf',
        cdnUrlPrefix: 'https://legacy-cdn.example.com/uploads',
        cdnKey: 'file-id'
      }),
      {
        filename: 'report.pdf',
        url: 'https://legacy-cdn.example.com/uploads/file-id?attname=report.pdf'
      }
    )
  })

  it('supports self-hosted URLs and rejects unsafe protocols', () => {
    assert.strictEqual(isHttpUrl('https://forms.example.com/path'), true)
    assert.strictEqual(isHttpUrl('http://forms.example.com/path'), true)
    assert.strictEqual(isHttpUrl('javascript:alert(1)'), false)
    assert.strictEqual(isHttpUrl('data:text/html,payload'), false)

    assert.deepStrictEqual(
      getFileUploadValue({
        filename: 'local.txt',
        url: 'http://kyndform_backend:9157/static/upload/id'
      }),
      {
        filename: 'local.txt',
        url: 'http://kyndform_backend:9157/static/upload/id?attname=local.txt'
      }
    )
    assert.deepStrictEqual(getFileUploadValue('/static/upload/id'), {
      filename: 'Attachment',
      url: '/static/upload/id?attname=Attachment'
    })
    assert.strictEqual(getFileUploadValue('ftp://forms.example.com/upload/id'), undefined)
    assert.strictEqual(getFileUploadValue('javascript:alert(1)'), undefined)
  })

  it('dashboard only links to trusted upload origins', () => {
    const allowedOrigins = ['https://forms.example.com', 'https://uploads.example.com/storage']

    assert.deepStrictEqual(
      getFileUploadValue(
        { filename: 'report.pdf', url: 'https://uploads.example.com/file-id' },
        allowedOrigins
      ),
      {
        filename: 'report.pdf',
        url: 'https://uploads.example.com/file-id?attname=report.pdf'
      }
    )
    assert.strictEqual(
      getFileUploadValue(
        { filename: 'Signed_Contract.pdf', url: 'https://attacker.example/phish' },
        allowedOrigins
      ),
      undefined
    )
    assert.deepStrictEqual(
      getFileUploadValue('/static/upload/file-id', allowedOrigins, 'https://forms.example.com'),
      {
        filename: 'Attachment',
        url: '/static/upload/file-id?attname=Attachment'
      }
    )
    assert.strictEqual(
      isAllowedUrlOrigin('https://uploads.example.com.attacker.test/file-id', allowedOrigins),
      false
    )
  })

  it('only trusted stripe receipts are clickable', () => {
    assert.strictEqual(
      isTrustedStripeReceiptUrl('https://pay.stripe.com/receipts/payment/abc'),
      true
    )
    assert.strictEqual(isTrustedStripeReceiptUrl('javascript:alert(document.domain)'), false)
    assert.strictEqual(
      isTrustedStripeReceiptUrl('http://pay.stripe.com/receipts/payment/abc'),
      false
    )
    assert.strictEqual(
      isTrustedStripeReceiptUrl('https://pay.stripe.com.attacker.test/receipts/payment/abc'),
      false
    )
  })
})
