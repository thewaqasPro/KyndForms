import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'

import { helper } from '@kyndform/utils'
import { GqlExecutionContext } from '@nestjs/graphql'

@Injectable()
export class SystemAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context)
    let { req } = ctx.getContext()

    if (helper.isEmpty(req)) {
      req = context.switchToHttp().getRequest()
    }

    if (!req.user) {
      throw new UnauthorizedException('Authentication required')
    }

    if (!req.user.isSystemAdmin) {
      throw new ForbiddenException('System Administrator privileges required')
    }

    return true
  }
}
