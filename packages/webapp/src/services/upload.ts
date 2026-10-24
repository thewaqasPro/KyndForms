import { FileUploadValue } from '@kyndform/shared-types-enums'
import axios from 'axios'

import { getDeviceId } from '@/utils'

export interface UploadContext {
  fieldId?: string
  formId?: string
  openToken?: string
  workspaceId?: string
  projectId?: string
}

export class UploadService {
  static async upload(file: File | Blob, context?: UploadContext): Promise<FileUploadValue> {
    const formData = new FormData()
    const filename =
      (file as any).name ||
      (typeof File !== 'undefined' && file instanceof File ? file.name : 'upload.png')
    formData.append('file', file, filename)

    const deviceId = getDeviceId()

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
      ...(deviceId ? { 'x-device-id': deviceId } : {})
    }

    if (context) {
      if (context.fieldId) headers['x-kyndform-field-id'] = context.fieldId
      if (context.formId) headers['x-kyndform-form-id'] = context.formId
      if (context.openToken) headers['x-kyndform-open-token'] = context.openToken
      if (context.workspaceId) headers['x-kyndform-workspace-id'] = context.workspaceId
      if (context.projectId) headers['x-kyndform-project-id'] = context.projectId
    }

    const result = await axios.post('/api/upload', formData, {
      withCredentials: true,
      headers
    })

    return result.data
  }
}
