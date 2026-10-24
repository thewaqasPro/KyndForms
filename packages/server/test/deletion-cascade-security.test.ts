import { FormStatusEnum } from '@kyndform/shared-types-enums'
import * as assert from 'assert'

import { DeleteProjectCodeResolver } from '../src/resolver/project/delete-project-code.resolver'
import { DeleteProjectResolver } from '../src/resolver/project/delete-project.resolver'
import { DissolveTeamCodeResolver } from '../src/resolver/team/dissolve-team-code.resolver'
import { DissolveTeamResolver } from '../src/resolver/team/dissolve-team.resolver'
import { UserDeletionCodeResolver } from '../src/resolver/user/user-deletion-code.resolver'
import { DeleteUserAccountSchedule } from '../src/schedule/delete-user-account.schedule'
import { FormService } from '../src/service/form.service'

const DISABLE_FORM_UPDATE = {
  'settings.active': false,
  status: FormStatusEnum.TRASH
}

async function testDeletionCodeEmailsUseRateLimitedGeneration() {
  const keys: string[] = []
  const emails: string[] = []
  const authService = {
    getVerificationCodeWithRateLimit: async (key: string) => {
      keys.push(key)
      return '123456'
    },
    getVerificationCode: async () => {
      throw new Error('unthrottled verification code generation must not be used')
    }
  }
  const mailService = {
    accountDeletionRequest: async () => {
      emails.push('account')
    },
    teamDeletionRequest: async () => {
      emails.push('workspace')
    },
    projectDeletionRequest: async () => {
      emails.push('project')
    }
  }

  await new UserDeletionCodeResolver(mailService as any, authService as any).userDeletionCode({
    id: 'user_1',
    email: 'owner@example.com',
    lang: 'en'
  } as any)
  await new DissolveTeamCodeResolver(authService as any, mailService as any).dissolveTeamCode(
    { id: 'team_1', isOwner: true, name: 'Workspace' } as any,
    { id: 'user_1', email: 'owner@example.com', lang: 'en' } as any,
    { teamId: 'team_1' }
  )
  await new DeleteProjectCodeResolver(authService as any, mailService as any).deleteProjectCode(
    { id: 'team_1', isOwner: true, name: 'Workspace' } as any,
    { id: 'project_1', name: 'Project' } as any,
    { id: 'user_1', email: 'owner@example.com', lang: 'en' } as any,
    { projectId: 'project_1' }
  )

  assert.deepStrictEqual(keys, [
    'user_deletion:user_1',
    'verify_dissolve_team:team_1',
    'verify_delete_project:project_1'
  ])
  assert.deepStrictEqual(emails, ['account', 'workspace', 'project'])
}

async function testFindAllInProjectDoesNotExcludeActiveForms() {
  let conditions: Record<string, any> | undefined
  const formService = new FormService(
    {
      find: async (value: Record<string, any>) => {
        conditions = value
        return []
      }
    } as any,
    {} as any,
    {} as any,
    {} as any
  )

  await formService.findAllInProject('project_1')

  assert.deepStrictEqual(conditions, { projectId: 'project_1' })
}

async function testProjectDeletionDisablesAndPurgesFormsBeforeProject() {
  const events: string[] = []
  const resolver = new DeleteProjectResolver(
    {
      attemptsCheck: async (_key: string, check: () => Promise<void>) => check(),
      checkVerificationCode: async () => {
        events.push('verification')
      }
    } as any,
    {
      deleteAllMemberInProject: async () => {
        events.push('delete project members')
      },
      delete: async () => {
        events.push('delete project')
      }
    } as any,
    {
      findAllInProject: async () => {
        events.push('find forms')
        return [{ id: 'form_1' }, { id: 'form_2' }]
      },
      updateMany: async (formIds: string[], updates: Record<string, any>) => {
        assert.deepStrictEqual(formIds, ['form_1', 'form_2'])
        assert.deepStrictEqual(updates, DISABLE_FORM_UPDATE)
        events.push('disable forms')
      },
      delete: async () => {
        events.push('delete forms')
      }
    } as any,
    {
      deleteAll: async () => {
        events.push('delete submissions')
      }
    } as any,
    {
      projectDeletionAlert: () => {
        events.push('send alert')
      }
    } as any,
    {
      deleteByProject: async (projectId: string) => {
        assert.strictEqual(projectId, 'project_1')
        events.push('delete project media')
      }
    } as any
  )

  await resolver.deleteProject(
    { id: 'team_1', isOwner: true, name: 'Workspace' } as any,
    { id: 'project_1', name: 'Project' } as any,
    { email: 'owner@example.com', lang: 'en', name: 'Owner' } as any,
    { projectId: 'project_1', code: '123456' }
  )

  assert.deepStrictEqual(events, [
    'verification',
    'find forms',
    'disable forms',
    'delete submissions',
    'delete forms',
    'delete project media',
    'delete project members',
    'delete project',
    'send alert'
  ])
}

async function testWorkspaceDeletionDisablesAndPurgesFormsBeforeWorkspace() {
  const events: string[] = []
  const resolver = new DissolveTeamResolver(
    {
      attemptsCheck: async (_key: string, check: () => Promise<void>) => check(),
      checkVerificationCode: async () => {
        events.push('verification')
      }
    } as any,
    {
      deleteAllMemberInTeam: async () => {
        events.push('delete workspace members')
      },
      delete: async () => {
        events.push('delete workspace')
      }
    } as any,
    {
      findAllInTeam: async () => {
        events.push('find forms')
        return [{ id: 'form_1' }]
      },
      updateMany: async (_formIds: string[], updates: Record<string, any>) => {
        assert.deepStrictEqual(updates, DISABLE_FORM_UPDATE)
        events.push('disable forms')
      },
      delete: async () => {
        events.push('delete forms')
      }
    } as any,
    {
      deleteAll: async () => {
        events.push('delete submissions')
      }
    } as any,
    {
      teamDeletionAlert: () => {
        events.push('send alert')
      }
    } as any,
    {
      deleteByTeam: async (teamId: string) => {
        assert.strictEqual(teamId, 'team_1')
        events.push('delete workspace media')
      }
    } as any
  )

  await resolver.dissolveTeam(
    { id: 'team_1', isOwner: true, name: 'Workspace' } as any,
    { email: 'owner@example.com', lang: 'en', name: 'Owner' } as any,
    { teamId: 'team_1', code: '123456' }
  )

  assert.deepStrictEqual(events, [
    'verification',
    'find forms',
    'disable forms',
    'delete submissions',
    'delete forms',
    'delete workspace media',
    'delete workspace members',
    'delete workspace',
    'send alert'
  ])
}

async function testAccountDeletionCleansOwnedWorkspaceBeforeUser() {
  const events: string[] = []
  const schedule = new DeleteUserAccountSchedule(
    {
      findAllDeletionScheduled: async () => [
        { id: 'user_1', email: 'owner@example.com', lang: 'en' }
      ],
      delete: async () => {
        events.push('delete user')
      }
    } as any,
    {
      deleteByUserId: async () => {
        events.push('delete social logins')
      }
    } as any,
    {
      findAll: async () => [
        { id: 'owned_team', ownerId: 'user_1' },
        { id: 'joined_team', ownerId: 'another_user' }
      ],
      deleteAllMemberInTeam: async () => {
        events.push('delete workspace members')
      },
      delete: async () => {
        events.push('delete workspace')
      },
      deleteMember: async () => {
        events.push('leave joined workspace')
      }
    } as any,
    {
      findAllInTeam: async () => {
        events.push('find forms')
        return [{ id: 'form_1' }]
      },
      updateMany: async (_formIds: string[], updates: Record<string, any>) => {
        assert.deepStrictEqual(updates, DISABLE_FORM_UPDATE)
        events.push('disable forms')
      },
      delete: async () => {
        events.push('delete forms')
      }
    } as any,
    {
      deleteAll: async () => {
        events.push('delete submissions')
      }
    } as any,
    {
      accountDeletionAlert: async () => {
        events.push('send alert')
      }
    } as any,
    {
      deleteByTeam: async (_teamId: string) => {
        events.push('delete workspace media')
      }
    } as any
  )

  await schedule.deleteUserAccount()

  assert.deepStrictEqual(events, [
    'find forms',
    'disable forms',
    'delete submissions',
    'delete forms',
    'delete workspace media',
    'delete workspace members',
    'delete workspace',
    'leave joined workspace',
    'delete social logins',
    'delete user',
    'send alert'
  ])
}

async function run() {
  await testDeletionCodeEmailsUseRateLimitedGeneration()
  await testFindAllInProjectDoesNotExcludeActiveForms()
  await testProjectDeletionDisablesAndPurgesFormsBeforeProject()
  await testWorkspaceDeletionDisablesAndPurgesFormsBeforeWorkspace()
  await testAccountDeletionCleansOwnedWorkspaceBeforeUser()
}

if (require.main === module) {
  run().catch(error => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exitCode = 1
  })
}
