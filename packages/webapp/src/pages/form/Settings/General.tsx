import { IconLayoutList, IconPresentation } from '@tabler/icons-react'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/utils'

import { Form, Switch } from '@/components'

interface LayoutModeSelectorProps {
  value?: string
  onChange?: (value: string) => void
}

const LayoutModeSelector: FC<LayoutModeSelectorProps> = ({
  value = 'conversational',
  onChange
}) => {
  const current = value || 'conversational'

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        onClick={() => onChange?.('conversational')}
        className={cn(
          'cursor-pointer rounded-xl border p-4 transition-all',
          current === 'conversational'
            ? 'border-primary bg-primary-light/30 ring-primary/30 ring-2'
            : 'border-accent-light hover:border-accent bg-transparent'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              current === 'conversational'
                ? 'bg-primary/10 text-primary'
                : 'bg-accent-light text-secondary'
            )}
          >
            <IconPresentation className="h-5 w-5" />
          </div>
          <div>
            <div
              className={cn(
                'text-sm font-semibold',
                current === 'conversational' ? 'text-primary' : 'text-primary'
              )}
            >
              Conversational
            </div>
            <div className="text-secondary text-xs">
              One question at a time with smooth transitions
            </div>
          </div>
        </div>
      </div>

      <div
        onClick={() => onChange?.('classic')}
        className={cn(
          'cursor-pointer rounded-xl border p-4 transition-all',
          current === 'classic'
            ? 'border-primary bg-primary-light/30 ring-primary/30 ring-2'
            : 'border-accent-light hover:border-accent bg-transparent'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              current === 'classic' ? 'bg-primary/10 text-primary' : 'bg-accent-light text-primary'
            )}
          >
            <IconLayoutList className="h-5 w-5" />
          </div>
          <div>
            <div
              className={cn(
                'text-sm font-semibold',
                current === 'classic' ? 'text-primary' : 'text-primary'
              )}
            >
              Classic Website Form
            </div>
            <div className="text-secondary text-xs">All questions on a single scrolling page</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FormSettingsGeneral() {
  const { t } = useTranslation()

  return (
    <section id="general">
      <h2 className="hf-section-title">{t('form.settings.general.title')}</h2>

      <div className="mt-6 space-y-8">
        <Form.Item
          name="layoutMode"
          label="Form Layout"
          description="Choose how respondents experience your form: step-by-step slides or a standard single-page form"
        >
          <LayoutModeSelector />
        </Form.Item>

        <Form.Item
          className="[&_[data-slot=content]]:pt-1.5"
          name="allowArchive"
          label={t('form.settings.general.archive.headline')}
          description={t('form.settings.general.archive.subHeadline')}
          isInline
        >
          <Switch />
        </Form.Item>

        <Form.Item
          className="[&_[data-slot=content]]:pt-1.5"
          name="enableProgress"
          label={t('form.settings.general.progressBar.headline')}
          description={t('form.settings.general.progressBar.subHeadline')}
          isInline
        >
          <Switch />
        </Form.Item>

        <Form.Item
          className="[&_[data-slot=content]]:pt-1.5"
          name="enableQuestionList"
          label={t('form.settings.general.viewQuestions.headline')}
          description={t('form.settings.general.viewQuestions.subHeadline')}
          isInline
        >
          <Switch />
        </Form.Item>

        <Form.Item
          className="[&_[data-slot=content]]:pt-1.5"
          name="enableNavigationArrows"
          label={t('form.settings.general.navigationArrows.headline')}
          description={t('form.settings.general.navigationArrows.subHeadline')}
          isInline
        >
          <Switch />
        </Form.Item>
      </div>
    </section>
  )
}
