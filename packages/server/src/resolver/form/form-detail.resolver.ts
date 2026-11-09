import { Auth, FormGuard, Team } from '@decorator'
import { FormDetailInput, FormType, PublicFormType } from '@graphql'
import { date, helper } from '@kyndform/utils'
import { FormModel, TeamModel } from '@model'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { FormService, IntegrationService, SubmissionService } from '@service'

const DEFAULT_FORM_NAME = 'Untitled'

@Resolver()
@Auth()
export class FormDetailResolver {
  constructor(
    private readonly formService: FormService,
    private readonly submissionService: SubmissionService
  ) {}

  @Query(returns => FormType)
  @FormGuard()
  async formDetail(
    @Team() team: TeamModel,
    @Args('input') input: FormDetailInput
  ): Promise<FormModel> {
    const [form, submissionCount] = await Promise.all([
      this.formService.findById(input.formId),
      this.submissionService.count({ formId: input.formId })
    ])

    //@ts-ignore
    form.updatedAt = date(form.get('updatedAt')).unix()

    //@ts-ignore
    form.submissionCount = submissionCount

    if (helper.isEmpty(form.name)) {
      form.name = DEFAULT_FORM_NAME
    }

    return form
  }
}

@Resolver()
export class PublicFormResolver {
  constructor(
    private readonly formService: FormService,
    private readonly integrationService?: IntegrationService
  ) {}

  @Query(returns => PublicFormType)
  async publicForm(@Args('input') input: FormDetailInput): Promise<PublicFormType> {
    const form = await this.formService.findPublicForm(input.formId)

    if (!form) {
      throw new Error('Form not found')
    }

    if (!form.teamId) {
      throw new Error('Form teamId is required')
    }

    if (!form.projectId) {
      throw new Error('Form projectId is required')
    }

    const integrations: Record<string, any> = {}

    if (form.settings?.active && this.integrationService) {
      const trackingApps = ['facebook-pixel', 'google-analytics']
      const result = await this.integrationService.findAllInFormByApps(input.formId, trackingApps)

      for (const row of result) {
        if (row.config && row.status !== 2) {
          integrations[row.appId] = row.config
        }
      }
    }

    return {
      id: form.id,
      teamId: form.teamId,
      projectId: form.projectId,
      memberId: form.memberId,
      name: helper.isEmpty(form.name) ? DEFAULT_FORM_NAME : form.name,
      description: form.description,
      interactiveMode: form.interactiveMode,
      kind: form.kind,
      settings: form.settings,
      drafts: form.drafts || form.fields || [],
      fields: form.fields || [],
      translations: form.translations || {},
      hiddenFields: form.hiddenFields || [],
      logics: form.logics || [],
      variables: form.variables || [],
      fieldsUpdatedAt: form.fieldsUpdatedAt || Date.now(),
      themeSettings: form.themeSettings || {},
      retentionAt: form.retentionAt,
      suspended: form.suspended || false,
      isDraft: form.isDraft || false,
      status: form.status,
      stripeAccount: form.stripeAccount,
      version: form.version || 1,
      canPublish: form.canPublish || false,
      customReport: form.customReport || {
        id: '',
        hiddenFields: [],
        theme: {},
        enablePublicAccess: false
      },
      integrations
    }
  }
}
