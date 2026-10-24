import { Auth, TeamGuard, User } from '@decorator'
import { DeleteMediaInput } from '@graphql'
import { UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { MediaService } from '@service'

@Resolver()
@Auth()
export class DeleteMediaResolver {
  constructor(private readonly mediaService: MediaService) {}

  @TeamGuard()
  @Mutation(returns => Boolean)
  async deleteMedia(
    @User() _user: UserModel,
    @Args('input') input: DeleteMediaInput
  ): Promise<boolean> {
    return this.mediaService.delete(input.id, input.teamId)
  }
}
