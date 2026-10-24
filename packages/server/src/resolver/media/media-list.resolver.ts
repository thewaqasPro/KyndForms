import { Auth, TeamGuard, User } from '@decorator'
import { MediaListInput, MediaType } from '@graphql'
import { UserModel } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { MediaService } from '@service'

@Resolver()
@Auth()
export class MediaListResolver {
  constructor(private readonly mediaService: MediaService) {}

  @TeamGuard()
  @Query(returns => [MediaType])
  async medias(
    @User() _user: UserModel,
    @Args('input') input: MediaListInput
  ): Promise<MediaType[]> {
    const items = await this.mediaService.findAll({
      teamId: input.teamId,
      projectId: input.projectId,
      keyword: input.keyword,
      page: input.page,
      limit: input.limit
    })

    return items.map(item => ({
      id: item.id,
      teamId: item.teamId,
      projectId: item.projectId,
      formId: item.formId,
      filename: item.filename,
      key: item.key,
      url: item.url,
      size: item.size,
      mimeType: item.mimeType,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }))
  }
}
