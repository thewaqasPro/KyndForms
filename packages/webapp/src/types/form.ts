import { FormField, FormModel, Property } from '@kyndform/shared-types-enums'

import { APP_STATUS_ENUM } from '@/consts'

export interface AppSettingType {
  type: string
  name: string
  label: string
  description?: string
  placeholder?: string
  required: boolean
}

export interface AppType {
  id: string
  name: string
  description?: string
  icon?: string
  settings?: AppSettingType[]
  status?: APP_STATUS_ENUM
}

export interface IntegratedAppType extends AppType {
  integration: IntegrationType
  isAuthorized?: boolean
}

export interface IntegrationType {
  id?: string
  formId?: string
  appId: string
  config?: AnyMap
  status: number
  lastFailureAt?: string | Date
  consecutiveFailures?: number
  lastErrorMessage?: string
}

export interface FormFieldType extends FormField {
  isCollapsed?: boolean
  parent?: FormFieldType
  properties?: Omit<Property, 'fields'> & {
    fields?: FormField[]
  }
}

export interface TemplateType extends FormModel {
  category: string
  recordId?: string
}

export interface TemplateGroupType {
  id: string
  category: string
  templates: TemplateType[]
}

export interface ChatMessageType {
  id: string
  type: 'text' | 'notification'
  content: string
  isUser?: boolean
}
