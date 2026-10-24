import { FormStatusEnum } from '@kyndform/shared-types-enums'
import { BadRequestException } from '@nestjs/common'

import { Auth, Project, ProjectGuard, Team, User } from '@decorator'
import { DeleteProjectInput } from '@graphql'
import { ProjectModel, TeamModel, UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import {
  AuthService,
  FormService,
  MailService,
  MediaService,
  ProjectService,
  SubmissionService
} from '@service'

@Resolver()
@Auth()
export class DeleteProjectResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly projectService: ProjectService,
    private readonly formService: FormService,
    private readonly submissionService: SubmissionService,
    private readonly mailService: MailService,
    private readonly mediaService?: MediaService
  ) {}

  @ProjectGuard()
  @Mutation(returns => Boolean)
  async deleteProject(
    @Team() team: TeamModel,
    @Project() project: ProjectModel,
    @User() user: UserModel,
    @Args('input') input: DeleteProjectInput
  ): Promise<boolean> {
    if (!team.isOwner) {
      throw new BadRequestException("You don't have permission to delete the project")
    }

    const attemptsKey = `limit:delete_project:${project.id}`

    await this.authService.attemptsCheck(attemptsKey, async () => {
      const key = `verify_delete_project:${project.id}`
      await this.authService.checkVerificationCode(key, input.code)
    })

    const forms = await this.formService.findAllInProject(project.id)
    const formIds = forms.map(form => form.id)

    if (formIds.length > 0) {
      await this.formService.updateMany(formIds, {
        'settings.active': false,
        status: FormStatusEnum.TRASH
      })
      await this.submissionService.deleteAll(formIds)
      await this.formService.delete(formIds)
    }

    if (this.mediaService) {
      await this.mediaService.deleteByProject(project.id)
    }

    await this.projectService.deleteAllMemberInProject(project.id)
    await this.projectService.delete(project.id)

    this.mailService.projectDeletionAlert(
      user.email,
      {
        teamName: team.name,
        projectName: project.name,
        userName: user.name
      },
      user.lang
    )

    return true
  }
}
