import { FieldKindEnum } from '@kyndform/shared-types-enums'
import { describe, expect, it } from 'vitest'

import { answersToHtml, fieldValuesToAnswers } from '../src'

describe('Email Notification Formatting', () => {
  it('renders budget with commas as a single badge, not divided into 3 boxes', () => {
    const html = answersToHtml([
      {
        id: 'budget_field',
        title: 'Do you have a budget in mind?',
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        properties: {
          choices: [
            {
              id: 'choice_1',
              label: '$10,000 - $15,000'
            }
          ]
        },
        value: {
          value: ['choice_1']
        }
      }
    ])

    // Should contain exactly one badge for "$10,000 - $15,000"
    expect(html).toContain('$10,000 - $15,000</span>')
    // Should NOT contain split badges
    expect(html).not.toContain('$10</span>')
    expect(html).not.toContain('000 - $15</span>')
    // Count number of badges
    const badgeMatches = html.match(/border-radius: 9999px/g)
    expect(badgeMatches?.length).toBe(1)
  })

  it('renders direct array with comma strings as single badges in headless/direct submissions', () => {
    const html = answersToHtml([
      {
        id: 'budget_field',
        title: 'Do you have a budget in mind?',
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        value: ['$10,000 - $15,000']
      }
    ])

    expect(html).toContain('$10,000 - $15,000</span>')
    const badgeMatches = html.match(/border-radius: 9999px/g)
    expect(badgeMatches?.length).toBe(1)
  })

  it('resolves plain text mention and cleans raw asterisks and &nbsp;', () => {
    const html = answersToHtml([
      {
        id: 'name_field',
        title: 'Find The Perfect Engagement Ring For Your Style',
        kind: FieldKindEnum.SHORT_TEXT,
        value: 'Waqas'
      },
      {
        id: 'email_field',
        title:
          "@Find The Perfect Engagement Ring For Your Style*&nbsp;you're done!&nbsp;Now enter your email address to receive your results.*",
        kind: FieldKindEnum.EMAIL,
        value: 'info@thewaqas.com'
      }
    ])

    // Should render the respondent's actual name
    expect(html).toContain('Waqas')
    // Should NOT contain the unrendered placeholder title
    expect(html).not.toContain('@Find The Perfect Engagement Ring For Your Style')
    // Should NOT contain raw &nbsp; or &amp;nbsp; text
    expect(html).not.toContain('&amp;nbsp;')
    expect(html).not.toContain('&nbsp;')
    // Should NOT contain stray markdown asterisks
    expect(html).not.toContain('*')
    // Should render the email link properly
    expect(html).toContain('mailto:info@thewaqas.com')
  })

  it('resolves HTML mention span in question title', () => {
    const html = answersToHtml([
      {
        id: 'name_field',
        title: 'Find The Perfect Engagement Ring For Your Style',
        kind: FieldKindEnum.SHORT_TEXT,
        value: 'Waqas'
      },
      {
        id: 'email_field',
        title:
          '<span class="mention" data-mention="name_field">@Find The Perfect Engagement Ring For Your Style</span>*&nbsp;you\'re done!&nbsp;Now enter your email address to receive your results.*',
        kind: FieldKindEnum.EMAIL,
        value: 'info@thewaqas.com'
      }
    ])

    expect(html).toContain('Waqas')
    expect(html).not.toContain('@Find The Perfect Engagement Ring For Your Style')
    expect(html).not.toContain('&amp;nbsp;')
    expect(html).not.toContain('&nbsp;')
    expect(html).not.toContain('*')
  })

  it('handles multiple multiple-choice items with commas correctly', () => {
    const html = answersToHtml([
      {
        id: 'locations_field',
        title: 'Preferred Locations and Budgets',
        kind: FieldKindEnum.MULTIPLE_CHOICE,
        properties: {
          choices: [
            { id: 'c1', label: '$10,000 - $15,000' },
            { id: 'c2', label: 'Atlanta, GA' }
          ]
        },
        value: {
          value: ['c1', 'c2']
        }
      }
    ])

    expect(html).toContain('$10,000 - $15,000</span>')
    expect(html).toContain('Atlanta, GA</span>')
    const badgeMatches = html.match(/border-radius: 9999px/g)
    expect(badgeMatches?.length).toBe(2)
  })

  it('resolves mentions during fieldValuesToAnswers creation', () => {
    const fields = [
      {
        id: 'name_q',
        title: 'Find The Perfect Engagement Ring For Your Style',
        kind: FieldKindEnum.SHORT_TEXT
      },
      {
        id: 'email_q',
        title: [
          [
            'p',
            [
              ['mention', ['@Find The Perfect Engagement Ring For Your Style'], { id: 'name_q' }],
              " you're done! Now enter your email address to receive your results."
            ]
          ]
        ],
        kind: FieldKindEnum.EMAIL
      }
    ]

    const answers = fieldValuesToAnswers(fields as any, {
      name_q: 'Waqas',
      email_q: 'info@thewaqas.com'
    })

    expect(answers[1].title).toBe(
      "Waqas you're done! Now enter your email address to receive your results."
    )
  })
})
