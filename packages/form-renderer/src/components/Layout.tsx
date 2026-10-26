import type { Layout as FormLayout } from '@kyndform/shared-types-enums'
import clsx from 'clsx'
import type { FC } from 'react'
import { memo } from 'react'

import { isURL } from '../utils'
import { deepEqual, helper } from '@kyndform/utils'

export interface LayoutComponentProps extends FormLayout {
  className?: string
}

function filterStyle(brightness?: number) {
  if (!brightness) {
    return undefined
  }

  const value = 1 + brightness / 100

  if (value < 0) {
    return {
      filter: `brightness(${value})`
    }
  }

  return {
    filter: `contrast(${2 - value}) brightness(${value})`
  }
}

const LayoutComponent: FC<LayoutComponentProps> = props => {
  if (helper.isEmpty(props) || !isURL(props!.mediaUrl)) {
    return null
  }

  return (
    <div className={clsx(`kyndform-layout kyndform-layout-${props!.align}`, props.className)}>
      <img
        src={props!.mediaUrl}
        style={filterStyle(props!.brightness)}
        alt="KyndForm layout image"
      />
    </div>
  )
}

export const Layout = memo(LayoutComponent, deepEqual)
