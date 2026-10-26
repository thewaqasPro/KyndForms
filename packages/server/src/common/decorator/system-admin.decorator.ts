import { UseGuards, applyDecorators } from '@nestjs/common'

import { AuthGuard, DeviceIdGuard, SystemAdminGuard } from '@guard'

export function SystemAdmin(): any {
  return applyDecorators(UseGuards(DeviceIdGuard, AuthGuard, SystemAdminGuard))
}
