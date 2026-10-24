import { HiddenField, Variable } from '@kyndform/shared-types-enums'
import debounce from 'lodash/debounce'
import type { CSSProperties, ClipboardEvent, FC, KeyboardEvent, RefObject } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { RichTextTriggerSelection } from './utils'
import {
  getStyleFromRect,
  getTextPrecedingAtTrigger,
  getTriggerSelection,
  insertClipboardHTML,
  replaceTriggerText
} from './utils'
import { cn } from '@/utils'
import { htmlUtils } from '@kyndform/answer-utils'
import { helper } from '@kyndform/utils'

import { FormFieldType } from '@/types'

import { FloatingToolbar } from './FloatingToolbar'
import { MentionMenu } from './MentionMenu'

interface RichTextProps extends Omit<ComponentProps, 'onChange'> {
  innerRef: RefObject<HTMLDivElement>
  placeholder?: string
  onChange?: (value: string) => void
}

const MENTION_TRIGGER = '@'
const RICH_TEXT_TOOLBAR_SELECTOR = '[data-rich-text-toolbar="true"]'

export const RichText: FC<RichTextProps> = ({
  className,
  innerRef,
  placeholder,
  onChange,
  ...restProps
}) => {
  const [keyword, setKeyword] = useState<string>()
  const [inputKey, setInputKey] = useState<string>()
  const [isCompositing, setIsCompositing] = useState(false)
  const [isMentionOpen, setIsMentionOpen] = useState(false)
  const [isToolbarOpen, setIsToolbarOpen] = useState(false)
  const [portalStyle, setPortalStyle] = useState<CSSProperties>({})
  const [triggerSelection, setTriggerSelection] = useState<RichTextTriggerSelection>()
  const [toolbarRange, setToolbarRange] = useState<Range>()

  const handleUpdateCallback = useMemo(
    () =>
      debounce(() => {
        onChange?.(innerRef.current!.innerHTML)
      }, 300),
    []
  )

  function handleComposition(event: any) {
    switch (event.type) {
      case 'compositionstart':
        setIsCompositing(true)
        break

      case 'compositionend':
        setIsCompositing(false)
        handleUpdateCallback()
        break
    }
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault()

    if (!isToolbarOpen) {
      insertClipboardHTML(event)
      handleUpdateCallback()
    }
  }

  function hideToolbar() {
    setIsToolbarOpen(false)
    setToolbarRange(undefined)
  }

  function hideMentionMenu() {
    setKeyword(undefined)
    setIsMentionOpen(false)
  }

  function handleMentionSelect(type: string, option: Partial<FormFieldType> | Variable) {
    const ts = triggerSelection!
    const sel: RichTextTriggerSelection = {
      anchorNode: ts.anchorNode,
      startOffset: ts.startOffset! - 1,
      endOffset: ts.startOffset! + (keyword?.length || 0)
    }
    let mention: Parameters<typeof replaceTriggerText>[2]

    if (type === 'variable') {
      mention = {
        className: 'variable',
        dataAttribute: 'data-variable',
        id: option.id!,
        label: (option as Variable).name
      }
    } else if (type === 'mention') {
      const title = (option as FormFieldType).title

      mention = {
        className: 'mention',
        dataAttribute: 'data-mention',
        id: option.id!,
        label: htmlUtils.plain(
          Array.isArray(title) ? htmlUtils.serialize(title) : String(title || '')
        )
      }
    } else if (type === 'hiddenfield') {
      const name = (option as HiddenField).name

      mention = {
        className: 'hiddenfield',
        dataAttribute: 'data-hiddenfield',
        id: name,
        label: name
      }
    } else {
      return
    }

    replaceTriggerText(innerRef.current!, sel, mention)

    handleUpdateCallback()
    hideMentionMenu()
  }

  function handleToolbarSelectionChange() {
    const activeElement = document.activeElement

    if (activeElement instanceof HTMLElement && activeElement.closest(RICH_TEXT_TOOLBAR_SELECTOR)) {
      return
    }

    const sel = window.getSelection()

    if (!sel || sel.rangeCount < 1) {
      hideToolbar()
      return
    }

    const root = innerRef.current

    // Only show toolbar for non-collapsed selections fully inside this rich-text node.
    if (!root || !root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) {
      hideToolbar()
      return
    }

    const text = sel.toString().replace(/\u200b/g, '')

    if (!sel.isCollapsed && helper.isValid(text)) {
      setToolbarRange(sel.getRangeAt(0).cloneRange())
      setIsToolbarOpen(true)
    } else {
      hideToolbar()
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (isCompositing) {
      return
    }

    setInputKey(event.key)
  }

  function handleKeyUp() {
    if (isCompositing) {
      return
    }

    if (!isMentionOpen) {
      if (inputKey === MENTION_TRIGGER) {
        const selection = getTriggerSelection()

        setPortalStyle(getStyleFromRect(selection!.rect!))
        setIsMentionOpen(true)
        setTriggerSelection(selection)
      }

      handleToolbarSelectionChange()
    }
  }

  function handleInput() {
    if (isMentionOpen) {
      const { startOffset } = triggerSelection!
      const preceding = getTextPrecedingAtTrigger(MENTION_TRIGGER, startOffset)

      if (preceding.isTriggering) {
        setKeyword(preceding.text)
      } else {
        hideMentionMenu()
      }
    } else {
      if (isCompositing) {
        return
      }

      if (isToolbarOpen) {
        if (helper.isEmpty(innerRef.current!.innerHTML)) {
          hideToolbar()
        }
      }
    }

    cleanIfEmpty()
    handleUpdateCallback()
  }

  const cleanIfEmpty = useCallback(() => {
    if (innerRef.current) {
      const text = innerRef.current.textContent?.trim() || ''
      const hasSpecial = innerRef.current.querySelector(
        'img, [data-variable], [data-mention], [data-hiddenfield]'
      )

      if (!text && !hasSpecial && innerRef.current.innerHTML !== '') {
        innerRef.current.innerHTML = ''
      }
    }
  }, [innerRef])

  const handleCompositionCallback = useCallback(handleComposition, [])
  const handleKeyDownCallback = useCallback(handleKeyDown, [isCompositing])
  const handleKeyUpCallback = useCallback(handleKeyUp, [
    isCompositing,
    isMentionOpen,
    isToolbarOpen,
    inputKey,
    triggerSelection
  ])
  const handleInputCallback = useCallback(handleInput, [
    isCompositing,
    isMentionOpen,
    isToolbarOpen,
    triggerSelection,
    cleanIfEmpty
  ])
  const handlePasteCallback = useCallback(handlePaste, [isToolbarOpen])
  const handleToolbarSelectionChangeCallback = useCallback(handleToolbarSelectionChange, [innerRef])
  const hideMentionMenuCallback = useCallback(hideMentionMenu, [])
  const handleMentionSelectCallback = useCallback(handleMentionSelect, [keyword, triggerSelection])
  const hideToolbarCallback = useCallback(hideToolbar, [])

  useEffect(() => {
    function handleSelectionChange() {
      if (!isMentionOpen) {
        handleToolbarSelectionChangeCallback()
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [isMentionOpen, handleToolbarSelectionChangeCallback])

  return (
    <>
      <div
        ref={innerRef}
        className={cn('rich-text', className)}
        data-placeholder={placeholder}
        contentEditable={true}
        suppressContentEditableWarning={true}
        tabIndex={0}
        onCompositionStart={handleCompositionCallback}
        onCompositionEnd={handleCompositionCallback}
        onKeyDown={handleKeyDownCallback}
        onKeyUp={handleKeyUpCallback}
        onInput={handleInputCallback}
        onPaste={handlePasteCallback}
        onMouseUp={handleToolbarSelectionChangeCallback}
        onBlur={cleanIfEmpty}
        {...restProps}
      />

      <MentionMenu
        visible={isMentionOpen}
        keyword={keyword}
        portalStyle={portalStyle}
        onClose={hideMentionMenuCallback}
        onComplete={handleMentionSelectCallback}
      />

      <FloatingToolbar
        visible={isToolbarOpen}
        range={toolbarRange}
        onClose={hideToolbarCallback}
        onChange={console.log}
      />
    </>
  )
}
