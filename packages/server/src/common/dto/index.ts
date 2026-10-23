import { Transform } from 'class-transformer'
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator'

import {
  isAllowedHostname,
  isAllowedUrlOrigin,
  isLocalDevelopmentHost,
  isLocalHostname,
  isPrivateAddress
} from '../../utils/outbound-url'
import { APP_HOMEPAGE_URL, S3_ENDPOINT, S3_PUBLIC_URL } from '@environments'
import { TRUSTED_UPLOAD_ORIGINS } from '@utils'

function getHostname(url?: string): string | undefined {
  if (!url) {
    return
  }

  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return
  }
}

function getOrigin(url?: string): string | undefined {
  if (!url) {
    return
  }

  try {
    return new URL(url).origin.toLowerCase()
  } catch {
    return
  }
}

export const FIRST_PARTY_IMAGE_HOSTS = Array.from(
  new Set(
    [
      getHostname(APP_HOMEPAGE_URL),
      getHostname(S3_PUBLIC_URL),
      getHostname(S3_ENDPOINT),
      ...TRUSTED_UPLOAD_ORIGINS.map(getHostname)
    ].filter(Boolean) as string[]
  )
)

export const FIRST_PARTY_IMAGE_ORIGINS = Array.from(
  new Set(
    [
      getOrigin(APP_HOMEPAGE_URL),
      getOrigin(S3_PUBLIC_URL),
      getOrigin(S3_ENDPOINT),
      ...TRUSTED_UPLOAD_ORIGINS.map(getOrigin),
      ...TRUSTED_UPLOAD_ORIGINS
    ].filter(Boolean) as string[]
  )
)

export const ALLOWED_IMAGE_HOSTS = [
  'secure.gravatar.com',
  'googleusercontent.com',
  'images.unsplash.com',
  'unsplash.com',
  ...FIRST_PARTY_IMAGE_HOSTS
]

export function isAllowedImageUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const isAllowedHost = ALLOWED_IMAGE_HOSTS.some(allowedHost =>
      isAllowedHostname(hostname, [allowedHost])
    )

    if (isLocalDevelopmentHost(hostname)) {
      return true
    }

    if (
      (isLocalHostname(hostname) || isPrivateAddress(hostname)) &&
      !isAllowedUrlOrigin(url, FIRST_PARTY_IMAGE_ORIGINS)
    ) {
      return false
    }

    return isAllowedHost
  } catch {
    return false
  }
}

@ValidatorConstraint({ name: 'isAllowedImageUrl', async: false })
class IsAllowedImageUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string): boolean {
    return isAllowedImageUrl(url)
  }

  defaultMessage(): string {
    return 'url host is not allowed'
  }
}

export class ImageResizingDto {
  @IsUrl({
    require_protocol: true
  })
  @Validate(IsAllowedImageUrlConstraint)
  url: string

  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(4096)
  @IsOptional()
  w?: number

  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(4096)
  @IsOptional()
  h?: number
}

export class ExportSubmissionsDto {
  @IsString()
  formId: string
}
