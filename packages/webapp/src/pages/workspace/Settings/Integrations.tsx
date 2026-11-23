import { IconRefresh, IconTrash } from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { FC, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { IntegrationService } from '@/services'
import { useParam } from '@/utils'

import { Badge, Button, Form, Image, Input, Modal, useAlert, useToast } from '@/components'
import { useWorkspaceStore } from '@/store'

interface WorkspaceAppDef {
  id: string
  name: string
  icon: string
  description: string
  supportsWorkspaceAuth: boolean
}

const WORKSPACE_APPS: WorkspaceAppDef[] = [
  {
    id: 'podium',
    name: 'Podium',
    icon: '/static/podium.svg',
    description:
      'Sync form leads directly into Podium Contacts & Conversations. Centralizes OAuth credentials and auto-refreshed access tokens for all forms.',
    supportsWorkspaceAuth: true
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    icon: '/static/klaviyo.svg',
    description:
      'Sync subscribers and contacts into Klaviyo email marketing campaigns and automated customer flows.',
    supportsWorkspaceAuth: false
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    icon: '/static/google-sheets.svg',
    description:
      'Automatically record submissions and lead information into Google Sheets spreadsheets.',
    supportsWorkspaceAuth: false
  }
]

interface ConfigModalProps {
  open: boolean
  app: WorkspaceAppDef | null
  currentConfig?: Record<string, any>
  onClose: () => void
  onSuccess: () => void
}

const PodiumConfigModal: FC<ConfigModalProps> = ({
  open,
  app,
  currentConfig,
  onClose,
  onSuccess
}) => {
  const { workspaceId } = useParam()
  const { workspace } = useWorkspaceStore()
  const toast = useToast()
  const currentTeamId = workspace?.id || workspaceId

  async function handleFinish(values: Record<string, any>) {
    try {
      if (!currentTeamId || !app) return

      await IntegrationService.updateWorkspaceSettings(currentTeamId, app.id, {
        apiToken: values.apiToken?.trim(),
        locationUid: values.locationUid?.trim(),
        clientId: values.clientId?.trim(),
        clientSecret: values.clientSecret?.trim(),
        refreshToken: values.refreshToken?.trim()
      })

      toast({
        title: 'Workspace Integration Saved',
        message: `${app.name} credentials updated for ${workspace?.name || 'Workspace'}.`
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        message: err?.message || 'Failed to save workspace credentials.'
      })
      throw err
    }
  }

  if (!app) return null

  return (
    <Modal
      open={open}
      contentProps={{
        className: 'max-w-xl',
        forceMount: true
      }}
      onOpenChange={state => {
        if (!state) onClose()
      }}
    >
      <div className="pt-4">
        <div className="flex items-center gap-3">
          <div className="border-accent-light flex h-10 w-10 items-center justify-center rounded-lg border p-1.5">
            <Image src={app.icon} className="h-full w-full object-contain" />
          </div>
          <div>
            <h3 className="text-primary text-base font-semibold">
              Configure {app.name} Workspace Connection
            </h3>
            <p className="text-secondary text-xs">
              Centralized connection inherited across all forms in this workspace.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Form.Simple
            className="space-y-4"
            initialValues={currentConfig || {}}
            fetch={handleFinish}
            refreshDeps={[open, currentConfig]}
            submitProps={{
              className: 'w-full !mt-6',
              label: 'Save Workspace Connection'
            }}
            submitOnChangedOnly={false}
          >
            <Form.Item
              name="apiToken"
              label="Podium API Access Token"
              footer="Bearer token from your Podium Developer Application with write_contacts permission."
              rules={[{ required: true, message: 'Podium API Access Token is required' }]}
            >
              <Input placeholder="Bearer eyJhbGciOi..." />
            </Form.Item>

            <Form.Item
              name="locationUid"
              label="Default Location UID"
              footer="The primary Location UID from your Podium account URL (e.g. 0f732703-b9a1-5dc4-a05d-387669bdc574)."
              rules={[{ required: true, message: 'Location UID is required' }]}
            >
              <Input placeholder="0f732703-b9a1-5dc4-a05d-387669bdc574" />
            </Form.Item>

            <div className="border-accent-light bg-accent-light/10 !mt-6 space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <IconRefresh className="text-primary h-4 w-4" />
                <h4 className="text-primary text-sm font-semibold">
                  Automatic Token Refresh (Recommended)
                </h4>
              </div>
              <p className="text-secondary text-xs leading-relaxed">
                Provide OAuth Developer App credentials to automatically renew access tokens
                whenever they expire, preventing delivery disruptions across all forms.
              </p>

              <Form.Item
                name="clientId"
                label="OAuth Client ID"
                footer="Client ID from your Podium Developer Application."
              >
                <Input placeholder="01a1f072-c542-..." />
              </Form.Item>

              <Form.Item
                name="clientSecret"
                label="OAuth Client Secret"
                footer="Client Secret from your Podium Developer Application."
              >
                <Input placeholder="311364ae..." />
              </Form.Item>

              <Form.Item
                name="refreshToken"
                label="OAuth Refresh Token"
                footer="OAuth refresh token used to generate fresh access tokens."
              >
                <Input placeholder="49c48039c0dfcc7..." />
              </Form.Item>
            </div>
          </Form.Simple>
        </div>
      </div>
    </Modal>
  )
}

export default function WorkspaceIntegrations() {
  const { t } = useTranslation()
  const { workspaceId } = useParam()
  const { workspace } = useWorkspaceStore()
  const alert = useAlert()
  const toast = useToast()

  const currentTeamId = workspace?.id || workspaceId

  const { data: workspaceIntegrations = [], refresh } = useRequest(
    async () => {
      if (!currentTeamId) return []
      return await IntegrationService.getWorkspaceIntegrations(currentTeamId)
    },
    {
      refreshDeps: [currentTeamId]
    }
  )

  const [activeModalApp, setActiveModalApp] = useState<WorkspaceAppDef | null>(null)

  const integrationsMap = useMemo(() => {
    const map: Record<string, any> = {}
    for (const item of workspaceIntegrations) {
      if (item?.appId) {
        map[item.appId] = item
      }
    }
    return map
  }, [workspaceIntegrations])

  function handleOpenConfigure(app: WorkspaceAppDef) {
    setActiveModalApp(app)
  }

  function handleDeleteConnection(app: WorkspaceAppDef) {
    alert({
      title: `Disconnect ${app.name}?`,
      description: `Are you sure you want to remove the shared workspace connection for ${app.name}? Forms relying on workspace credentials will stop syncing until reconnected or updated with standalone credentials.`,
      confirmProps: {
        label: t('components.delete'),
        className: 'bg-error text-primary-light dark:text-primary hover:bg-error'
      },
      cancelProps: {
        label: t('components.cancel')
      },
      onConfirm: async () => {
        try {
          if (!currentTeamId) return
          await IntegrationService.deleteWorkspaceSettings(currentTeamId, app.id)
          toast({
            title: 'Connection Removed',
            message: `${app.name} workspace connection was disconnected.`
          })
          refresh()
        } catch (err: any) {
          toast({
            title: 'Error',
            message: err?.message || 'Failed to remove workspace connection.'
          })
        }
      }
    })
  }

  return (
    <section id="integrations" className="border-accent-light border-b py-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="hf-section-title">Workspace Integrations</h2>
          <p className="text-secondary mt-1 text-sm">
            Centralized integrations and credentials inherited across all forms in this workspace.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        {WORKSPACE_APPS.map(app => {
          const integration = integrationsMap[app.id]
          const isConnected = Boolean(
            integration?.config?.apiToken || integration?.config?.locationUid
          )

          return (
            <div
              key={app.id}
              className="border-accent-light hover:border-accent-light/80 flex flex-col justify-between gap-4 rounded-xl border p-5 transition-colors sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-4">
                <div className="border-accent-light bg-accent-light/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border p-2">
                  <Image src={app.icon} className="h-full w-full object-contain" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-primary text-sm font-semibold">{app.name}</h3>
                    {app.supportsWorkspaceAuth ? (
                      isConnected ? (
                        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400">
                          Connected
                        </Badge>
                      ) : (
                        <Badge className="bg-secondary/10 text-secondary border-accent-light text-xs">
                          Not Connected
                        </Badge>
                      )
                    ) : (
                      <Badge className="bg-secondary/10 text-secondary border-accent-light text-xs">
                        Configured per-form
                      </Badge>
                    )}
                  </div>
                  <p className="text-secondary max-w-xl text-xs leading-relaxed">
                    {app.description}
                  </p>
                  {isConnected && integration?.config && (
                    <div className="text-secondary flex flex-wrap items-center gap-3 pt-1 text-xs">
                      {integration.config.locationUid && (
                        <div>
                          Location:{' '}
                          <span className="text-primary font-mono font-medium">
                            {integration.config.locationUid}
                          </span>
                        </div>
                      )}
                      <div>
                        Auto-Refresh:{' '}
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {integration.config.clientId ? 'Enabled' : 'Direct Token'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:self-center">
                {app.supportsWorkspaceAuth && (
                  <>
                    {isConnected ? (
                      <Button.Ghost size="sm" onClick={() => handleOpenConfigure(app)}>
                        Configure
                      </Button.Ghost>
                    ) : (
                      <Button size="sm" onClick={() => handleOpenConfigure(app)}>
                        Connect
                      </Button>
                    )}
                    {isConnected && (
                      <button
                        type="button"
                        className="text-secondary hover:text-error rounded-lg p-2 transition-colors"
                        title="Disconnect"
                        onClick={() => handleDeleteConnection(app)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <PodiumConfigModal
        open={Boolean(activeModalApp)}
        app={activeModalApp}
        currentConfig={activeModalApp ? integrationsMap[activeModalApp.id]?.config : undefined}
        onClose={() => setActiveModalApp(null)}
        onSuccess={() => refresh()}
      />
    </section>
  )
}
