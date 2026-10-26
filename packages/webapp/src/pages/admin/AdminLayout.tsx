import {
  IconActivity,
  IconArrowLeft,
  IconSettings,
  IconShield,
  IconUsers
} from '@tabler/icons-react'
import { FC, PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useRouter } from '@/utils'

import { Button } from '@/components'
import { useUserStore } from '@/store'

export const AdminLayout: FC<PropsWithChildren> = ({ children }) => {
  const { user } = useUserStore()
  const router = useRouter()
  const location = useLocation()

  if (!user || !user.isSystemAdmin) {
    return <Navigate to="/" replace />
  }

  const isSettings = location.pathname.startsWith('/admin/settings')
  const isUsers = location.pathname.startsWith('/admin/users')
  const isStatus = location.pathname.startsWith('/admin/status')

  return (
    <div className="bg-background text-primary min-h-screen">
      <header className="border-accent-light bg-foreground sticky top-0 z-20 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button.Link
              size="sm"
              className="text-secondary hover:text-primary"
              onClick={() => router.redirect('/workspace')}
            >
              <IconArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Workspace
            </Button.Link>
            <div className="bg-accent-light h-5 w-px" />
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <IconShield className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-base font-semibold leading-tight">Admin Console</h1>
                <p className="text-secondary text-xs">System Settings &amp; Governance</p>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {isStatus ? (
              <Button size="sm" onClick={() => router.redirect('/admin/status')}>
                <IconActivity className="mr-1.5 h-4 w-4" />
                Status
              </Button>
            ) : (
              <Button.Ghost size="sm" onClick={() => router.redirect('/admin/status')}>
                <IconActivity className="mr-1.5 h-4 w-4" />
                Status
              </Button.Ghost>
            )}

            {isSettings ? (
              <Button size="sm" onClick={() => router.redirect('/admin/settings')}>
                <IconSettings className="mr-1.5 h-4 w-4" />
                Settings
              </Button>
            ) : (
              <Button.Ghost size="sm" onClick={() => router.redirect('/admin/settings')}>
                <IconSettings className="mr-1.5 h-4 w-4" />
                Settings
              </Button.Ghost>
            )}

            {isUsers ? (
              <Button size="sm" onClick={() => router.redirect('/admin/users')}>
                <IconUsers className="mr-1.5 h-4 w-4" />
                Users
              </Button>
            ) : (
              <Button.Ghost size="sm" onClick={() => router.redirect('/admin/users')}>
                <IconUsers className="mr-1.5 h-4 w-4" />
                Users
              </Button.Ghost>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
