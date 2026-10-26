import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconH1,
  IconH2,
  IconH3,
  IconItalic,
  IconLink,
  IconUnderline,
  IconUnlink
} from '@tabler/icons-react'
import type { CSSProperties, FC } from 'react'
import { startTransition, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getStyleFromRect } from './utils'
import { cn, nextTick } from '@/utils'
import { helper } from '@kyndform/utils'

import { Button, Form, Input, Portal } from '@/components'

interface FloatingToolbarProps extends Omit<ComponentProps, 'onChange'> {
  visible?: boolean
  range?: Range
  onClose?: () => void
  onChange: () => void
}

interface ActiveState {
  isBold: boolean
  isItalic: boolean
  isStrikethrough: boolean
  isUnderline: boolean
  isJustifyLeft: boolean
  isJustifyCenter: boolean
  isJustifyRight: boolean
  blockFormat?: string
  link?: string
}

function getActiveState() {
  const state: ActiveState = {
    isBold: document.queryCommandState('bold'),
    isItalic: document.queryCommandState('italic'),
    isStrikethrough: document.queryCommandState('strikethrough'),
    isUnderline: document.queryCommandState('underline'),
    isJustifyLeft: document.queryCommandState('justifyLeft'),
    isJustifyCenter: document.queryCommandState('justifyCenter'),
    isJustifyRight: document.queryCommandState('justifyRight'),
    blockFormat: String(document.queryCommandValue('formatBlock') || '').toLowerCase(),
    link: undefined
  }

  const sel = window.getSelection()

  if (sel) {
    state.link = sel.anchorNode?.parentElement?.closest('a')?.href
  }

  return state
}

export const FloatingToolbar: FC<FloatingToolbarProps> = ({
  visible,
  range,
  onChange,
  onClose,
  ...restProps
}) => {
  const { t } = useTranslation()

  const [portalStyle, setPortalStyle] = useState<CSSProperties>()
  const [activeState, setActiveState] = useState({} as ActiveState)
  const [linkBubbleVisible, setLinkBubbleVisible] = useState(false)

  function handleSelectRange() {
    const sel = window.getSelection()
    if (sel && range) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
    return sel
  }

  function handleBold() {
    handleSelectRange()
    document.execCommand('bold')
    startTransition(() => {
      setActiveState(getActiveState())
      onChange()
    })
  }

  function handleItalic() {
    handleSelectRange()
    document.execCommand('italic')
    startTransition(() => {
      setActiveState(getActiveState())
      onChange()
    })
  }

  function handleUnderline() {
    handleSelectRange()
    document.execCommand('underline')
    startTransition(() => {
      setActiveState(getActiveState())
      onChange()
    })
  }

  function handleFormatBlock(tag: 'h1' | 'h2' | 'h3') {
    handleSelectRange()
    const current = activeState.blockFormat
    const target = current === tag ? 'p' : tag
    document.execCommand('formatBlock', false, target)
    startTransition(() => {
      setActiveState(getActiveState())
      onChange()
    })
  }

  function handleAlign(alignment: 'justifyLeft' | 'justifyCenter' | 'justifyRight') {
    handleSelectRange()
    document.execCommand(alignment)
    startTransition(() => {
      setActiveState(getActiveState())
      onChange()
    })
  }

  function handleLinkOpen() {
    setLinkBubbleVisible(true)
  }

  async function handleLink({ url }: any) {
    setLinkBubbleVisible(false)

    handleSelectRange()
    document.execCommand('createlink', false, url)

    startTransition(() => {
      setActiveState(getActiveState())
      onChange()
    })
  }

  function handleUnlink() {
    handleSelectRange()
    document.execCommand('unlink')

    nextTick(() => {
      setActiveState(getActiveState())
    })

    onChange()
  }

  useEffect(() => {
    if (helper.isValid(range) && range instanceof Range) {
      setPortalStyle(getStyleFromRect(range!.getBoundingClientRect()))
    }
  }, [range])

  useEffect(() => {
    if (visible) {
      setActiveState(getActiveState())
    }

    setLinkBubbleVisible(false)

    return () => {
      setActiveState({} as ActiveState)
    }
  }, [visible])

  return (
    <Portal visible={visible}>
      <div className="floating-toolbar">
        <div className="floating-toolbar-mask" onClick={onClose} />
        <div
          data-rich-text-toolbar="true"
          className="floating-toolbar-container bg-foreground border-accent-light flex items-center rounded-lg border px-2 py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
          style={portalStyle}
          {...restProps}
        >
          {linkBubbleVisible ? (
            <Form.Simple
              className="flex items-center gap-x-1.5 [&_[data-slot=control]]:space-y-0"
              initialValues={{
                url: activeState.link
              }}
              submitProps={{
                label: t('components.apply'),
                size: 'sm'
              }}
              fetch={handleLink}
              submitOnChangedOnly
            >
              <Form.Item name="url" rules={[{ required: true }]}>
                <Input
                  className="[&_[data-slot=input]]:p-1"
                  placeholder={t('form.builder.compose.pasteLink')}
                />
              </Form.Item>
            </Form.Simple>
          ) : (
            <>
              {/* Text formatting */}
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.isBold && 'text-primary bg-accent/40 rounded'
                )}
                iconOnly
                title="Bold"
                onClick={handleBold}
              >
                <IconBold className="h-4 w-4" />
              </Button.Link>
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.isItalic && 'text-primary bg-accent/40 rounded'
                )}
                iconOnly
                title="Italic"
                onClick={handleItalic}
              >
                <IconItalic className="h-4 w-4" />
              </Button.Link>
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.isUnderline && 'text-primary bg-accent/40 rounded'
                )}
                iconOnly
                title="Underline"
                onClick={handleUnderline}
              >
                <IconUnderline className="h-4 w-4" />
              </Button.Link>

              <div className="border-accent-light mx-1 h-4 w-px border-l" />

              {/* Headings */}
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.blockFormat === 'h1' && 'text-primary bg-accent/40 rounded font-bold'
                )}
                iconOnly
                title="Heading 1"
                onClick={() => handleFormatBlock('h1')}
              >
                <IconH1 className="h-4 w-4" />
              </Button.Link>
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.blockFormat === 'h2' && 'text-primary bg-accent/40 rounded font-bold'
                )}
                iconOnly
                title="Heading 2"
                onClick={() => handleFormatBlock('h2')}
              >
                <IconH2 className="h-4 w-4" />
              </Button.Link>
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.blockFormat === 'h3' && 'text-primary bg-accent/40 rounded font-bold'
                )}
                iconOnly
                title="Heading 3"
                onClick={() => handleFormatBlock('h3')}
              >
                <IconH3 className="h-4 w-4" />
              </Button.Link>

              <div className="border-accent-light mx-1 h-4 w-px border-l" />

              {/* Text Alignments */}
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.isJustifyLeft && 'text-primary bg-accent/40 rounded'
                )}
                iconOnly
                title="Align Left"
                onClick={() => handleAlign('justifyLeft')}
              >
                <IconAlignLeft className="h-4 w-4" />
              </Button.Link>
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.isJustifyCenter && 'text-primary bg-accent/40 rounded'
                )}
                iconOnly
                title="Align Center"
                onClick={() => handleAlign('justifyCenter')}
              >
                <IconAlignCenter className="h-4 w-4" />
              </Button.Link>
              <Button.Link
                size="sm"
                className={cn(
                  'text-secondary hover:text-primary',
                  activeState.isJustifyRight && 'text-primary bg-accent/40 rounded'
                )}
                iconOnly
                title="Align Right"
                onClick={() => handleAlign('justifyRight')}
              >
                <IconAlignRight className="h-4 w-4" />
              </Button.Link>

              <div className="border-accent-light mx-1 h-4 w-px border-l" />

              {/* Links */}
              <Button.Link
                size="sm"
                className="text-secondary hover:text-primary"
                iconOnly
                title="Insert Link"
                onClick={handleLinkOpen}
              >
                <IconLink className="h-4 w-4" />
              </Button.Link>
              {activeState.link && (
                <Button.Link
                  size="sm"
                  className="text-secondary hover:text-primary"
                  iconOnly
                  title="Remove Link"
                  onClick={handleUnlink}
                >
                  <IconUnlink className="h-4 w-4" />
                </Button.Link>
              )}
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
