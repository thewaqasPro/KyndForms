import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { promises as fs } from 'fs'
import { memoryStorage } from 'multer'
import { basename, extname, resolve } from 'path'

import {
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_FORCE_PATH_STYLE,
  S3_PUBLIC_URL,
  S3_REGION,
  S3_SECRET_ACCESS_KEY,
  UPLOAD_DIR
} from '@environments'
import { helper, nanoid } from '@kyndform/utils'

export * from './image'

interface UploadType {
  extensions: string[]
  signature?: (buffer: Buffer) => boolean
  text?: boolean
}

export interface SavedUploadFile {
  bucket?: string
  filename: string
  key?: string
  location?: string
  mimetype: string
  originalname: string
  path?: string
  size: number
}

const startsWith = (buffer: Buffer, signature: number[]): boolean =>
  buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte)

const isZip = (buffer: Buffer): boolean =>
  startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
  startsWith(buffer, [0x50, 0x4b, 0x05, 0x06]) ||
  startsWith(buffer, [0x50, 0x4b, 0x07, 0x08])

const isOfficeOpenXml = (buffer: Buffer, directory: string): boolean =>
  isZip(buffer) &&
  buffer.includes(Buffer.from('[Content_Types].xml')) &&
  buffer.includes(Buffer.from(`${directory}/`))

const isLegacyOffice = (buffer: Buffer): boolean =>
  startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])

const UPLOAD_TYPES: Record<string, UploadType> = {
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    signature: buffer => startsWith(buffer, [0xff, 0xd8, 0xff])
  },
  'image/png': {
    extensions: ['.png'],
    signature: buffer => startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  },
  'image/bmp': {
    extensions: ['.bmp'],
    signature: buffer => startsWith(buffer, [0x42, 0x4d])
  },
  'image/webp': {
    extensions: ['.webp'],
    signature: buffer =>
      startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
      buffer.length >= 12 &&
      buffer.subarray(8, 12).equals(Buffer.from('WEBP'))
  },
  'image/gif': {
    extensions: ['.gif'],
    signature: buffer =>
      buffer.subarray(0, 6).equals(Buffer.from('GIF87a')) ||
      buffer.subarray(0, 6).equals(Buffer.from('GIF89a'))
  },
  'text/plain': { extensions: ['.txt'], text: true },
  'text/markdown': { extensions: ['.md', '.markdown'], text: true },
  'text/csv': { extensions: ['.csv'], text: true },
  'application/pdf': {
    extensions: ['.pdf'],
    signature: buffer => buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))
  },
  'application/msword': { extensions: ['.doc'], signature: isLegacyOffice },
  'application/vnd.ms-excel': { extensions: ['.xls'], signature: isLegacyOffice },
  'application/vnd.ms-powerpoint': { extensions: ['.ppt'], signature: isLegacyOffice },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    signature: buffer => isOfficeOpenXml(buffer, 'word')
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensions: ['.xlsx'],
    signature: buffer => isOfficeOpenXml(buffer, 'xl')
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extensions: ['.pptx'],
    signature: buffer => isOfficeOpenXml(buffer, 'ppt')
  },
  'video/mp4': {
    extensions: ['.mp4'],
    signature: buffer => buffer.length >= 12 && buffer.subarray(4, 8).equals(Buffer.from('ftyp'))
  },
  'video/x-ms-wmv': {
    extensions: ['.wmv'],
    signature: buffer => startsWith(buffer, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11])
  },
  'application/zip': { extensions: ['.zip'], signature: isZip },
  'application/vnd.rar': {
    extensions: ['.rar'],
    signature: buffer => startsWith(buffer, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])
  },
  'application/x-7z-compressed': {
    extensions: ['.7z'],
    signature: buffer => startsWith(buffer, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])
  }
}

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    forcePathStyle: S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY
    }
  })
}

function isS3Configured(): boolean {
  return (
    helper.isValid(S3_ENDPOINT) &&
    helper.isValid(S3_REGION) &&
    helper.isValid(S3_BUCKET) &&
    helper.isValid(S3_ACCESS_KEY_ID) &&
    helper.isValid(S3_SECRET_ACCESS_KEY)
  )
}

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
  'application/x-pdf': 'application/pdf',
  'application/acrobat': 'application/pdf',
  'applications/vnd.pdf': 'application/pdf',
  'text/pdf': 'application/pdf',
  'application/x-zip-compressed': 'application/zip',
  'application/x-zip': 'application/zip',
  'multipart/x-zip': 'application/zip',
  'application/x-tar': 'application/x-tar',
  'application/x-gzip': 'application/gzip',
  'application/gzip': 'application/gzip'
}

function normalizeMimeType(mimeType: unknown): string {
  const raw = String(mimeType || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()

  return MIME_ALIASES[raw] || raw
}

export function sanitizeUploadFilename(filename: unknown): string {
  const normalized = Array.from(basename(String(filename || '').replace(/\\/g, '/')))
    .map(character => {
      const codePoint = character.codePointAt(0) || 0
      return codePoint <= 0x1f || codePoint === 0x7f || character === '"' || character === "'"
        ? '_'
        : character
    })
    .join('')
    .trim()

  return (normalized || 'attachment').slice(0, 180)
}

export function getUploadType(filename: unknown, mimeType: unknown): UploadType | undefined {
  const normalizedMimeType = normalizeMimeType(mimeType)
  const uploadType = UPLOAD_TYPES[normalizedMimeType]
  const extension = extname(String(filename || '')).toLowerCase()

  if (!uploadType || !uploadType.extensions.includes(extension)) {
    return undefined
  }

  return uploadType
}

export function isUploadFileContentValid(file: {
  buffer?: Buffer
  mimetype?: string
  originalname?: string
}): boolean {
  const uploadType = getUploadType(file.originalname, file.mimetype)
  const buffer = file.buffer

  if (!uploadType || !Buffer.isBuffer(buffer)) {
    return false
  }

  if (uploadType.text) {
    if (buffer.includes(0)) {
      return false
    }

    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer)
      return true
    } catch {
      return false
    }
  }

  return uploadType.signature?.(buffer) === true
}

export function uploadFileFilter(
  _req: unknown,
  file: { mimetype?: string; originalname?: string },
  callback: (error: Error | null, acceptFile: boolean) => void
): void {
  callback(null, Boolean(getUploadType(file?.originalname, file?.mimetype)))
}

export function getMulterStorage() {
  // Keep uploads in bounded memory until their form/session context and contents have been
  // validated. This prevents rejected requests from leaving local or S3 objects behind.
  return memoryStorage()
}

export function getUploadContentDisposition(
  filename: unknown,
  mimeType: unknown,
  forceAttachment = false
): string {
  const safeFilename = sanitizeUploadFilename(filename)
  const disposition =
    !forceAttachment && normalizeMimeType(mimeType).startsWith('image/') ? 'inline' : 'attachment'
  const encodedFilename = encodeURIComponent(safeFilename).replace(
    /['()]/g,
    character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  )

  return `${disposition}; filename="attachment"; filename*=UTF-8''${encodedFilename}`
}

function getS3Location(key: string): string {
  const prefix = helper.isValid(S3_PUBLIC_URL)
    ? S3_PUBLIC_URL.replace(/\/+$/, '')
    : `${S3_ENDPOINT.replace(/\/+$/, '')}/${S3_BUCKET}`

  return `${prefix}/${key}`
}

export async function saveUploadedFile(file: {
  buffer: Buffer
  mimetype: string
  originalname: string
  size: number
}): Promise<SavedUploadFile> {
  const mimeType = normalizeMimeType(file.mimetype)
  let extension = extname(file.originalname).toLowerCase()
  if (!extension) {
    const uploadType = getUploadType(file.originalname, file.mimetype)
    if (uploadType && uploadType.extensions.length > 0) {
      extension = uploadType.extensions[0]
    }
  }
  const filename = `${nanoid(24)}${extension}`
  const originalname = sanitizeUploadFilename(file.originalname)

  if (isS3Configured()) {
    await getS3Client().send(
      new PutObjectCommand({
        ACL: 'public-read',
        Body: file.buffer,
        Bucket: S3_BUCKET,
        ContentDisposition: getUploadContentDisposition(originalname, mimeType),
        ContentLength: file.buffer.length,
        ContentType: mimeType,
        Key: filename,
        Metadata: {
          originalFilename: encodeURIComponent(originalname)
        }
      })
    )

    return {
      bucket: S3_BUCKET,
      filename,
      key: filename,
      location: getS3Location(filename),
      mimetype: mimeType,
      originalname,
      size: file.buffer.length
    }
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const path = resolve(UPLOAD_DIR, filename)
  await fs.writeFile(path, file.buffer, { flag: 'wx' })

  return {
    filename,
    mimetype: mimeType,
    originalname,
    path,
    size: file.buffer.length
  }
}

export async function deleteUploadedFile(key: string): Promise<boolean> {
  if (!key) {
    return false
  }

  if (isS3Configured()) {
    try {
      await getS3Client().send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: key
        })
      )
      return true
    } catch (err) {
      console.error(`Failed to delete S3 file ${key}:`, err)
      return false
    }
  }

  try {
    const path = resolve(UPLOAD_DIR, basename(key))
    await fs.unlink(path)
    return true
  } catch (err: any) {
    if (err && err.code === 'ENOENT') {
      return true
    }
    console.error(`Failed to delete local file ${key}:`, err)
    return false
  }
}

export async function deleteUploadedFiles(keys: string[]): Promise<number> {
  const validKeys = (keys || []).filter(k => Boolean(k && typeof k === 'string'))
  if (validKeys.length === 0) {
    return 0
  }

  if (isS3Configured()) {
    try {
      const chunkSize = 1000
      let deletedCount = 0
      for (let i = 0; i < validKeys.length; i += chunkSize) {
        const chunk = validKeys.slice(i, i + chunkSize)
        const response = await getS3Client().send(
          new DeleteObjectsCommand({
            Bucket: S3_BUCKET,
            Delete: {
              Objects: chunk.map(Key => ({ Key })),
              Quiet: true
            }
          })
        )
        const errorsCount = response.Errors?.length || 0
        deletedCount += chunk.length - errorsCount
      }
      return deletedCount
    } catch (err) {
      console.error('Failed to batch delete S3 files:', err)
      return 0
    }
  }

  let deletedCount = 0
  for (const key of validKeys) {
    const success = await deleteUploadedFile(key)
    if (success) {
      deletedCount++
    }
  }
  return deletedCount
}
