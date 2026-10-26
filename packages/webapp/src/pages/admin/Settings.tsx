import { IconCheck, IconDeviceFloppy } from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { useEffect, useState } from 'react'

import { AdminService, SystemSettings } from '@/services/admin'

import { Button, ImageFormPicker, Input, Switch } from '@/components'

import { AdminLayout } from './AdminLayout'

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    allowRegistration: true,
    appName: 'KyndForm',
    appLogoUrl: '',
    maxFormsPerWorkspace: 0,
    maxSubmissionsPerMonth: 0,
    maxUploadFileSizeMB: 20
  })
  const [saved, setSaved] = useState(false)

  const { loading: fetching, run: fetchSettings } = useRequest(
    async () => {
      const data = await AdminService.getSystemSettings()
      setSettings(data)
    },
    {
      manual: true
    }
  )

  useEffect(() => {
    fetchSettings()
  }, [])

  const { loading: saving, run: handleSave } = useRequest(
    async () => {
      const updated = await AdminService.updateSystemSettings({
        allowRegistration: settings.allowRegistration,
        appName: settings.appName,
        appLogoUrl: settings.appLogoUrl,
        maxFormsPerWorkspace: Number(settings.maxFormsPerWorkspace) || 0,
        maxSubmissionsPerMonth: Number(settings.maxSubmissionsPerMonth) || 0,
        maxUploadFileSizeMB: Number(settings.maxUploadFileSizeMB) || 20
      })
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    {
      manual: true
    }
  )

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight">System &amp; Registration Settings</h2>
          <p className="text-secondary mt-1 text-sm">
            Configure global access, branding, and resource limits for your KyndForm instance.
          </p>
        </div>

        {/* Section 1: User Registration Control */}
        <div className="border-accent-light bg-foreground rounded-xl border p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">User Registration</h3>
              <p className="text-secondary mt-1 text-sm">
                Control whether new users are allowed to register publicly on your instance.
              </p>
              <div className="mt-2 text-xs">
                {settings.allowRegistration ? (
                  <span className="inline-flex items-center font-medium text-emerald-600">
                    ● Public registration is currently OPEN. Anyone can sign up.
                  </span>
                ) : (
                  <span className="inline-flex items-center font-medium text-amber-600">
                    ● Public registration is DISABLED. New users can only join via direct workspace
                    invitations.
                  </span>
                )}
              </div>
            </div>
            <Switch
              value={settings.allowRegistration}
              onChange={val => setSettings(prev => ({ ...prev, allowRegistration: !!val }))}
            />
          </div>
        </div>

        {/* Section 2: Platform Branding & Logo */}
        <div className="border-accent-light bg-foreground space-y-6 rounded-xl border p-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold">Platform Branding</h3>
            <p className="text-secondary mt-1 text-sm">
              Customize the instance name and upload a custom logo for the sidebar and login
              screens.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Instance Name</label>
              <Input
                value={settings.appName || ''}
                placeholder="KyndForm"
                onChange={val => setSettings(prev => ({ ...prev, appName: val }))}
              />
              <p className="text-secondary text-xs">
                Displayed in browser titles, email templates, and page headers.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Application Logo</label>
              <div className="flex items-center gap-4">
                <ImageFormPicker
                  value={settings.appLogoUrl}
                  fallback={settings.appName || 'K'}
                  resize={{ width: 120, height: 120 }}
                  onChange={val => setSettings(prev => ({ ...prev, appLogoUrl: val || '' }))}
                />
                <div className="text-secondary text-xs">
                  <p>Upload a PNG, SVG, or WebP logo.</p>
                  <p className="mt-0.5">
                    Recommended size: 240x240px or rectangular with transparent background.
                  </p>
                  {settings.appLogoUrl && (
                    <Button.Link
                      size="sm"
                      className="text-error mt-2 !p-0"
                      onClick={() => setSettings(prev => ({ ...prev, appLogoUrl: '' }))}
                    >
                      Remove custom logo
                    </Button.Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: System Resource Limitations */}
        <div className="border-accent-light bg-foreground space-y-6 rounded-xl border p-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold">Resource Limits &amp; Quotas</h3>
            <p className="text-secondary mt-1 text-sm">
              Define safety boundaries for workspaces on this instance. (Set to 0 for unlimited)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Forms / Workspace</label>
              <Input
                type="number"
                value={
                  settings.maxFormsPerWorkspace !== undefined
                    ? String(settings.maxFormsPerWorkspace)
                    : '0'
                }
                onChange={val =>
                  setSettings(prev => ({ ...prev, maxFormsPerWorkspace: Number(val) }))
                }
              />
              <p className="text-secondary text-xs">0 = unlimited forms per workspace.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Submissions / Month</label>
              <Input
                type="number"
                value={
                  settings.maxSubmissionsPerMonth !== undefined
                    ? String(settings.maxSubmissionsPerMonth)
                    : '0'
                }
                onChange={val =>
                  setSettings(prev => ({ ...prev, maxSubmissionsPerMonth: Number(val) }))
                }
              />
              <p className="text-secondary text-xs">0 = unlimited form submissions.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max File Upload Size (MB)</label>
              <Input
                type="number"
                value={
                  settings.maxUploadFileSizeMB !== undefined
                    ? String(settings.maxUploadFileSizeMB)
                    : '20'
                }
                onChange={val =>
                  setSettings(prev => ({ ...prev, maxUploadFileSizeMB: Number(val) }))
                }
              />
              <p className="text-secondary text-xs">Default is 20MB per file upload.</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          {saved && (
            <span className="flex items-center text-sm font-medium text-emerald-600">
              <IconCheck className="mr-1 h-4 w-4" />
              Settings saved successfully!
            </span>
          )}
          <Button size="md" loading={saving} disabled={fetching} onClick={handleSave}>
            <IconDeviceFloppy className="mr-1.5 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
}
