import * as assert from 'assert'

import { isSafeCSSValue, isSafeCustomCSS, sanitizeFormDrafts } from '../src/utils/form-schema'

function testSanitizesDraftRichText() {
  const drafts = sanitizeFormDrafts([
    {
      id: 'field_1',
      kind: 'short_text',
      title: '<p>Hello<img src=x onerror=alert(1)></p>',
      titleSchema: '<svg onload=alert(1)>bad</svg>',
      description: [
        [
          'a',
          ['<img src=x onerror=alert(1)>'],
          {
            href: '" onmouseover="alert(1)',
            style: 'background: url(javascript:alert(1))'
          }
        ]
      ],
      properties: {
        fields: [
          {
            id: 'child_1',
            kind: 'short_text',
            title: '<span onclick="alert(1)">Child</span>',
            description: '<script>alert(1)</script>'
          }
        ]
      }
    }
  ])

  assert.deepStrictEqual(drafts[0].title, [['p', ['Hello']]])
  assert.deepStrictEqual(drafts[0].titleSchema, [])
  assert.deepStrictEqual(drafts[0].description, [
    [
      'a',
      ['&lt;img src=x onerror=alert(1)&gt;'],
      {
        href: '&quot; onmouseover=&quot;alert(1)'
      }
    ]
  ])
  assert.deepStrictEqual(drafts[0].properties.fields[0].title, [['span', ['Child']]])
  assert.deepStrictEqual(drafts[0].properties.fields[0].description, [])
}

function testSanitizesNestedGroupDrafts() {
  const drafts = sanitizeFormDrafts([
    {
      id: 'group_1',
      kind: 'group',
      title: 'Parent',
      properties: {
        fields: [
          {
            id: 'group_2',
            kind: 'group',
            title: '<p>Child group</p>',
            properties: {
              fields: [
                {
                  id: 'child_1',
                  kind: 'short_text',
                  title: '<img src=x onerror=alert(1)>Nested child'
                }
              ]
            }
          }
        ]
      }
    }
  ])

  assert.deepStrictEqual(drafts[0].properties.fields[0].title, [['p', ['Child group']]])
  assert.deepStrictEqual(drafts[0].properties.fields[0].properties.fields[0].title, [
    'Nested child'
  ])
}

function testDropsUnsafeHrefProtocols() {
  const drafts = sanitizeFormDrafts([
    {
      id: 'field_1',
      kind: 'short_text',
      title: [
        [
          'a',
          ['click me'],
          {
            href: 'javascript:alert(1)'
          }
        ]
      ]
    }
  ])

  assert.deepStrictEqual(drafts[0].title, [['a', ['click me']]])
}

function testDropsControlCharacterSplitUnsafeHrefProtocols() {
  const drafts = sanitizeFormDrafts([
    {
      id: 'field_1',
      kind: 'short_text',
      title: [
        [
          'a',
          ['click me'],
          {
            href: 'java\tscript:alert(1)'
          }
        ]
      ]
    }
  ])

  assert.deepStrictEqual(drafts[0].title, [['a', ['click me']]])
}

function testCustomCssRejectsHtmlBreakingCharacters() {
  assert.strictEqual(isSafeCustomCSS('body { color: red; }'), true)
  assert.strictEqual(
    isSafeCustomCSS('body { color: red; }</style><script>alert(1)</script>'),
    false
  )
  assert.strictEqual(isSafeCustomCSS('body:before { content: "<"; }'), false)
}

function testCssValueRejectsRuleBreakingCharacters() {
  assert.strictEqual(isSafeCSSValue(undefined), true)
  assert.strictEqual(isSafeCSSValue(''), true)
  assert.strictEqual(isSafeCSSValue('https://forms.example.com/background.png?x=1&y=2'), true)
  assert.strictEqual(isSafeCSSValue('rgba(255, 255, 255, 0.8)'), true)
  assert.strictEqual(isSafeCSSValue('linear-gradient(to right, #fff 0%, #000 100%)'), true)
  assert.strictEqual(isSafeCSSValue('radial-gradient(circle, #fff 0%, #000 100%)'), true)
  assert.strictEqual(
    isSafeCSSValue('http://a.com/x);}body::after{content:"PWNED";position:fixed}/*'),
    false
  )
  assert.strictEqual(isSafeCSSValue('url(image.png); color: red'), false)
  assert.strictEqual(isSafeCSSValue('linear-gradient(#fff, #000)\u0000'), false)

  for (const character of ['<', '>', '{', '}', ';', '\u0000']) {
    assert.strictEqual(isSafeCSSValue(`red${character}`), false)
  }
}

function testSanitizesEndScreenButtons() {
  const drafts = sanitizeFormDrafts([
    {
      id: 'thank_you_1',
      kind: 'thank_you',
      title: 'Thank you',
      properties: {
        screenVariant: 'rich',
        buttons: [
          {
            id: 'btn_1',
            text: 'Learn More',
            label: 'Learn More',
            action: 'url',
            url: 'https://example.com',
            newTab: true,
            variant: 'primary'
          },
          {
            id: 'btn_2',
            text: 'Malicious',
            label: 'Malicious',
            action: 'url',
            url: 'javascript:alert(1)',
            newTab: false,
            variant: 'secondary'
          }
        ]
      }
    }
  ])

  assert.strictEqual(drafts[0].properties.buttons.length, 2)
  assert.strictEqual(drafts[0].properties.buttons[0].url, 'https://example.com')
  assert.strictEqual(drafts[0].properties.buttons[0].label, 'Learn More')
  assert.strictEqual(drafts[0].properties.buttons[1].url, '')
}

function run() {
  testSanitizesDraftRichText()
  testSanitizesNestedGroupDrafts()
  testDropsUnsafeHrefProtocols()
  testDropsControlCharacterSplitUnsafeHrefProtocols()
  testCustomCssRejectsHtmlBreakingCharacters()
  testCssValueRejectsRuleBreakingCharacters()
  testSanitizesEndScreenButtons()
}

if (require.main === module) {
  try {
    run()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  }
}
