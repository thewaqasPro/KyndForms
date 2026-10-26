import { SystemAdmin } from '@decorator'
import { AdminUserPaginationType } from '@graphql'
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql'
import { UserService } from '@service'

@Resolver()
@SystemAdmin()
export class AdminUserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => AdminUserPaginationType)
  async adminUsers(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('keyword', { nullable: true }) keyword?: string
  ): Promise<AdminUserPaginationType> {
    const { users, total } = await this.userService.findPaginated({
      page,
      limit,
      keyword
    })

    return {
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        isSystemAdmin: !!u.isSystemAdmin,
        isBlocked: !!u.isBlocked,
        isEmailVerified: !!u.isEmailVerified,
        createdAt: (u as any).createdAt ? new Date((u as any).createdAt).toISOString() : undefined
      })),
      total,
      page,
      limit
    }
  }

  @Mutation(() => Boolean)
  async adminToggleUserBlock(@Args('userId') userId: string): Promise<boolean> {
    return this.userService.toggleBlock(userId)
  }

  @Mutation(() => Boolean)
  async adminToggleUserRole(@Args('userId') userId: string): Promise<boolean> {
    return this.userService.toggleSystemAdmin(userId)
  }
}
