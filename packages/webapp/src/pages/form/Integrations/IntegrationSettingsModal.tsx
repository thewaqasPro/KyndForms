import { FormField, UNSELECTABLE_FIELD_KINDS } from '@kyndform/shared-types-enums'
import {
  IconCheck,
  IconDots,
  IconInfoCircle,
  IconLink,
  IconPlus,
  IconTrash
} from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { FC, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getIntegrationDescription, getIntegrationSetting } from './utils'
import { IntegrationService } from '@/services'
import { useParam } from '@/utils'

import IconLogo from '@/assets/logo.svg?react'
import { Button, Form, Image, Input, Modal, Select, Switch, useToast } from '@/components'
import { useAppStore, useFormStore, useModal, useWorkspaceStore } from '@/store'
import { IntegratedAppType } from '@/types'

import IntegrationSettingsItem from './IntegrationSettingsItem'

export interface IntegrationSettingsProps {
  app: IntegratedAppType
  onValuesChange?: (changedValues: Any, values: Any) => void
}

interface AttributeMappingRow {
  questionTitle: string
  attributeUid: string
}

const SettingsForm: FC<IntegrationSettingsProps> = ({ app, onValuesChange }) => {
  const { t } = useTranslation()
  const toast = useToast()

  const { formId, workspaceId } = useParam()
  const { closeModal } = useAppStore()
  const { updateIntegration, form } = useFormStore()
  const { workspace } = useWorkspaceStore()

  const currentTeamId = workspace?.id || workspaceId

  // Fetch workspace-level integration if available
  const { data: workspaceIntegration } = useRequest(
    async () => {
      if (currentTeamId && app.id) {
        return await IntegrationService.getWorkspaceIntegration(currentTeamId, app.id)
      }
      return null
    },
    {
      refreshDeps: [currentTeamId, app.id]
    }
  )

  const hasWorkspaceConnection = useMemo(() => {
    return Boolean(
      workspaceIntegration?.config?.apiToken || workspaceIntegration?.config?.locationUid
    )
  }, [workspaceIntegration])

  const [useGlobalConnection, setUseGlobalConnection] = useState<boolean>(() => {
    if (typeof app.integration?.config?.useGlobalConnection === 'boolean') {
      return app.integration.config.useGlobalConnection
    }
    return true
  })

  // Synchronize when workspace connection loads
  useEffect(() => {
    if (
      hasWorkspaceConnection &&
      typeof app.integration?.config?.useGlobalConnection !== 'boolean'
    ) {
      setUseGlobalConnection(true)
    }
  }, [hasWorkspaceConnection, app.integration?.config?.useGlobalConnection])

  const [saveToWorkspace, setSaveToWorkspace] = useState(false)

  // Attribute Mappings state
  const [attributeMappingsList, setAttributeMappingsList] = useState<AttributeMappingRow[]>(() => {
    const existing = app.integration?.config?.attributeMappings
    if (existing && typeof existing === 'object') {
      return Object.entries(existing).map(([questionTitle, attributeUid]) => ({
        questionTitle,
        attributeUid: String(attributeUid)
      }))
    }
    return []
  })

  const formQuestions = useMemo(() => {
    const fields: FormField[] = form?.drafts || []
    return fields.filter(
      (f: FormField) => f.title && !UNSELECTABLE_FIELD_KINDS.includes(f.kind as any)
    )
  }, [form?.drafts])

  function handleAddMapping() {
    setAttributeMappingsList(prev => [...prev, { questionTitle: '', attributeUid: '' }])
  }

  function handleRemoveMapping(index: number) {
    setAttributeMappingsList(prev => prev.filter((_, idx) => idx !== index))
  }

  function handleUpdateMapping(
    index: number,
    field: 'questionTitle' | 'attributeUid',
    val: string
  ) {
    setAttributeMappingsList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: val }
      return updated
    })
  }

  async function fetch(values: AnyMap) {
    try {
      const payload: AnyMap = {
        ...values
      }

      if (app.id === 'podium') {
        payload.useGlobalConnection = hasWorkspaceConnection ? useGlobalConnection : false

        // Compile attribute mappings
        const attrRecord: Record<string, string> = {}
        for (const m of attributeMappingsList) {
          if (m.questionTitle?.trim() && m.attributeUid?.trim()) {
            attrRecord[m.questionTitle.trim()] = m.attributeUid.trim()
          }
        }
        payload.attributeMappings = attrRecord

        // Optionally save to workspace as default connection
        if (saveToWorkspace && currentTeamId) {
          await IntegrationService.updateWorkspaceSettings(currentTeamId, app.id, {
            apiToken: values.apiToken,
            locationUid: values.locationUid,
            clientId: values.clientId,
            clientSecret: values.clientSecret,
            refreshToken: values.refreshToken
          })
          payload.useGlobalConnection = true
        }
      }

      await IntegrationService.updateSettings(formId, app.id, payload)

      updateIntegration(app.id, {
        config: payload
      })
      toast({
        title: 'Settings Saved',
        message: `${app.name} integration settings updated successfully.`
      })
      closeModal('IntegrationSettingsModal')
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        message: err?.message || 'Failed to save integration settings.'
      })
      throw err
    }
  }

  const isPodiumGlobalActive = app.id === 'podium' && hasWorkspaceConnection && useGlobalConnection

  return (
    <div className="space-y-6">
      {app.id === 'podium' && (
        <div className="space-y-4">
          {hasWorkspaceConnection ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <IconCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-primary text-sm font-semibold">
                      Workspace Connection Available
                    </h4>
                    <p className="text-secondary text-xs">
                      Global OAuth & API token configured for{' '}
                      <span className="text-primary font-medium">
                        {workspace?.name || 'Workspace'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-secondary text-xs font-medium">Use Workspace</span>
                  <Switch
                    value={useGlobalConnection}
                    onChange={val => setUseGlobalConnection(val)}
                  />
                </div>
              </div>

              {useGlobalConnection && (
                <div className="text-secondary mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-emerald-500/10 pt-3 text-xs">
                  <div>
                    Default Location UID:{' '}
                    <span className="text-primary font-mono font-medium">
                      {workspaceIntegration?.config?.locationUid || 'N/A'}
                    </span>
                  </div>
                  <div>
                    Token Renewal:{' '}
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {workspaceIntegration?.config?.clientId ? 'Automatic' : 'Direct Token'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-accent-light bg-accent-light/10 rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <IconInfoCircle className="text-secondary mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="text-primary text-sm font-medium">
                    Centralized Workspace Connection
                  </div>
                  <p className="text-secondary text-xs leading-relaxed">
                    You can manage shared credentials globally in{' '}
                    <span className="text-primary font-medium">
                      Workspace Settings → Integrations
                    </span>
                    , or save these credentials as the workspace default below.
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      className="border-input text-primary focus:ring-accent rounded"
                      checked={saveToWorkspace}
                      onChange={e => setSaveToWorkspace(e.target.checked)}
                    />
                    <span className="text-primary text-xs font-medium">
                      Save as Workspace Default Connection
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Form.Simple
        className="space-y-4"
        initialValues={{
          ...app.integration?.config,
          fields: app.integration?.config?.fields || [[]]
        }}
        fetch={fetch}
        refreshDeps={[formId, app.id, isPodiumGlobalActive, useGlobalConnection]}
        submitProps={{
          className: 'w-full !mt-2',
          label: t('form.integrations.connectWith', { name: app.name })
        }}
        submitOnChangedOnly={false}
        onValuesChange={onValuesChange}
      >
        {isPodiumGlobalActive ? (
          <>
            <Form.Item
              name="defaultLeadName"
              label="Default Lead Name (Fallback)"
              footer="Custom contact name used when the form has no name field. Defaults to '{Form Name} Lead' if left blank."
            >
              <Input placeholder="e.g. Diamond Quiz Lead" />
            </Form.Item>

            <Form.Item
              name="customTag"
              label="Automation Trigger Tag(s) (UUID)"
              footer="Podium Tag UID(s) to assign to contacts for targeted automations. Supports multiple comma-separated UUIDs."
            >
              <Input placeholder="00000000-0000-0000-0000-000000000000" />
            </Form.Item>

            <Form.Item
              name="locationUid"
              label="Location UID (Optional Override)"
              footer={`Leave blank to use workspace default (${workspaceIntegration?.config?.locationUid || ''}). Enter a specific Location UID to route responses for this form elsewhere.`}
            >
              <Input
                placeholder={
                  workspaceIntegration?.config?.locationUid
                    ? `Default: ${workspaceIntegration.config.locationUid}`
                    : 'e.g. 0f732703-b9a1-5dc4-a05d-387669bdc574'
                }
              />
            </Form.Item>
          </>
        ) : (
          app.settings?.map(setting => (
            <IntegrationSettingsItem
              key={setting.name}
              setting={getIntegrationSetting(t, app, setting)}
            />
          ))
        )}

        {app.id === 'podium' && (
          <div className="border-accent-light bg-accent-light/5 !mt-6 space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-primary text-sm font-semibold">
                  Custom Attribute Mappings (Optional)
                </h4>
                <p className="text-secondary text-xs">
                  Map form questions to custom attribute UUIDs defined in your Podium contacts
                  schema.
                </p>
              </div>
              <Button.Ghost
                type="button"
                size="sm"
                className="shrink-0 text-xs"
                onClick={handleAddMapping}
              >
                <IconPlus className="mr-1 h-3.5 w-3.5" />
                Add Mapping
              </Button.Ghost>
            </div>

            {attributeMappingsList.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                {attributeMappingsList.map((mapping, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-1/2">
                      {formQuestions.length > 0 ? (
                        <Select
                          placeholder="Select Question"
                          value={mapping.questionTitle}
                          options={formQuestions.map((q: FormField) => ({
                            value: q.title,
                            label: q.title
                          }))}
                          onChange={val => handleUpdateMapping(idx, 'questionTitle', String(val))}
                        />
                      ) : (
                        <Input
                          placeholder="Question Title (e.g. Ring Style)"
                          value={mapping.questionTitle}
                          onChange={val => handleUpdateMapping(idx, 'questionTitle', String(val))}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Podium Attribute UUID"
                        value={mapping.attributeUid}
                        onChange={val => handleUpdateMapping(idx, 'attributeUid', String(val))}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-secondary hover:text-error rounded-lg p-1.5 transition-colors"
                      title="Remove mapping"
                      onClick={() => handleRemoveMapping(idx)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary pt-1 text-xs italic">
                No custom attribute mappings configured. Outbound submissions will sync standard
                contact fields (name, email, phone, tags).
              </p>
            )}
          </div>
        )}
      </Form.Simple>
    </div>
  )
}

const Settings: FC<{ app: IntegratedAppType }> = ({ app }) => {
  const { t } = useTranslation()
  const [hasIconError, setHasIconError] = useState(false)

  return (
    <div>
      <div className="pt-6">
        <div className="flex items-center justify-center gap-x-4">
          <div className="border-accent-light h-12 w-12 rounded-lg border p-1.5">
            <IconLogo className="h-full w-full" />
          </div>

          <IconDots className="text-input h-6 w-6" />

          <div className="after:border-accent-light relative h-12 w-12 p-1 after:absolute after:inset-0 after:rounded-lg after:border">
            {!hasIconError && !!app.icon ? (
              <Image
                className="h-full w-full rounded-lg object-cover"
                src={app.icon}
                onError={() => setHasIconError(true)}
              />
            ) : (
              <div className="bg-accent-light text-secondary flex h-full w-full items-center justify-center rounded-lg">
                <IconLink className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-6 text-center text-lg/6 font-semibold">
          {t('form.integrations.connectWith', { name: app.name })}
        </h2>
        <p className="text-secondary mt-2 px-10 text-center text-sm">
          {getIntegrationDescription(t, app)}
        </p>
      </div>

      <div className="mt-8">
        <SettingsForm app={app} />
      </div>
    </div>
  )
}

export default function IntegrationSettingsModal() {
  const { isOpen, payload, onOpenChange } = useModal('IntegrationSettingsModal')

  return (
    <Modal
      open={isOpen}
      contentProps={{
        className: 'max-w-2xl',
        forceMount: true
      }}
      onOpenChange={onOpenChange}
    >
      {payload?.app && <Settings app={payload.app} />}
    </Modal>
  )
}
