import { BadRequestException } from '@nestjs/common'

import { Auth, Form, FormGuard, User } from '@decorator'
import { DuplicateFormInput } from '@graphql'
import { helper, pickValidValues } from '@kyndform/utils'
import { FormModel, UserModel } from '@model'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { FormService, SystemSettingService } from '@service'

@Resolver()
@Auth()
export class DuplicateFormResolver {
  constructor(
    private readonly formService: FormService,
    private readonly systemSettingService: SystemSettingService
  ) {}

  @Mutation(returns => String)
  @FormGuard()
  async duplicateForm(
    @User() user: UserModel,
    @Form() form: FormModel,
    @Args('input') input: DuplicateFormInput
  ): Promise<string> {
    const settings = await this.systemSettingService.getSettings()
    if (settings.maxFormsPerWorkspace && settings.maxFormsPerWorkspace > 0) {
      const existingFormsCount = await this.formService.countByTeamId(form.teamId)
      if (existingFormsCount >= settings.maxFormsPerWorkspace) {
        throw new BadRequestException(
          `Workspace form limit (${settings.maxFormsPerWorkspace}) reached`
        )
      }
    }

    const fields = [
      'variables',
      'logics',
      'translations',
      'hiddenFields',
      '_drafts',
      'kind',
      'interactiveMode',
      'settings',
      'teamId',
      'projectId',
      'themeSettings'
    ]
    const newForm: any = pickValidValues(form as any, fields)

    newForm.memberId = user.id
    newForm.name = input.name
    newForm.fields = []
    newForm.fieldsUpdatedAt = 0
    newForm.settings = {
      ...newForm.settings,
      active: false
    }

    if (helper.isEmpty(form._drafts)) {
      newForm._drafts = JSON.stringify(form.fields || [])
    }

    return await this.formService.create(newForm)
  }
}
