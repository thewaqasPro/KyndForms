import { Content, Description, Overlay, Portal, Root, Title } from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  IconActivity,
  IconArrowLeft,
  IconMenu,
  IconSettings,
  IconShield,
  IconUsers
} from '@tabler/icons-react'
import { FC, PropsWithChildren, useState } from 'react'
import { NavLink, Navigate, useLocation } from 'react-router-dom'

import { cn, useRouter } from '@/utils'

import Logo from '@/assets/logo.svg?react'
import { Button } from '@/components'
import { getAppLogoUrl, getAppName } from '@/consts'
import WorkspaceAccount from '@/layouts/Workspace/WorkspaceAccount'
import { useUserStore } from '@/store'

interface AdminSidebarProps {
  onNavigate?: () => void
}

const AdminSidebarComponent: FC<AdminSidebarProps> = ({ onNavigate }) => {
  const location = useLocation()
  const router = useRouter()
  const appName = getAppName()
  const appLogo = getAppLogoUrl()

  const links = [
    {
      to: '/admin/status',
      icon: IconActivity,
      label: 'System Status',
      active: location.pathname.startsWith('/admin/status')
    },
    {
      to: '/admin/settings',
      icon: IconSettings,
      label: 'Platform Settings',
      active: location.pathname.startsWith('/admin/settings')
    },
    {
      to: '/admin/users',
      icon: IconUsers,
      label: 'User Management',
      active: location.pathname.startsWith('/admin/users')
    }
  ]

  return (
    <div className="hf-sidebar-surface max-lg:bg-background flex h-full flex-col max-lg:rounded-lg max-lg:border">
      {/* Brand Header */}
      <div className="border-accent-light flex items-center justify-between border-b p-4">
        <a
          href="/admin/status"
          className="flex items-center gap-2.5 overflow-hidden"
          title={appName}
          onClick={e => {
            e.preventDefault()
            router.redirect('/admin/status')
            onNavigate?.()
          }}
        >
          {appLogo ? (
            <img src={appLogo} alt={appName} className="h-7 w-auto max-w-[120px] object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-auto" />
              <span className="truncate text-base font-semibold tracking-tight">{appName}</span>
            </div>
          )}
        </a>

        <span className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
          <IconShield className="h-3 w-3" />
          Admin
        </span>
      </div>

      {/* Navigation Links */}
      <div className="scrollbar flex flex-1 flex-col p-4">
        <div className="text-secondary mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider">
          Governance &amp; Ops
        </div>

        <nav className="flex flex-col gap-y-1">
          {links.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn('hf-sidebar-link', item.active && 'hf-sidebar-link-active')}
            >
              <item.icon className="hf-sidebar-link-icon" data-slot="icon" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-accent-light my-4 border-t" />

        <div className="text-secondary mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider">
          Navigation
        </div>

        <nav className="flex flex-col gap-y-1">
          <NavLink
            to="/workspace"
            onClick={onNavigate}
            className="hf-sidebar-link hover:text-primary text-secondary"
          >
            <IconArrowLeft className="hf-sidebar-link-icon" data-slot="icon" />
            <span className="truncate">Return to Workspace</span>
          </NavLink>
        </nav>
      </div>

      {/* User Account Controls */}
      <WorkspaceAccount containerClassName="max-lg:hidden" />
    </div>
  )
}

export const AdminLayout: FC<PropsWithChildren> = ({ children }) => {
  const { user } = useUserStore()
  const [isDrawerOpen, setDrawerOpen] = useState(false)

  if (!user || !user.isSystemAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="relative isolate flex min-h-svh w-full max-lg:flex-col">
      {/* Desktop Fixed Left Sidebar */}
      <div
        className="fixed inset-y-0 left-0 z-10 w-64 transition-transform duration-300 max-lg:hidden"
        data-slot="layout-sidebar"
      >
        <AdminSidebarComponent />
      </div>

      {/* Mobile Drawer Modal */}
      <Root open={isDrawerOpen} onOpenChange={setDrawerOpen}>
        <Portal>
          <Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-20 bg-black/60" />
          <Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left-0 data-[state=open]:slide-in-from-left-[80%] border-accent-light fixed bottom-2 left-2 top-2 z-20 w-72 rounded-lg border shadow-lg duration-200">
            <Title>
              <VisuallyHidden>Admin Navigation</VisuallyHidden>
            </Title>
            <Description>
              <VisuallyHidden>Admin console navigation drawer</VisuallyHidden>
            </Description>
            <AdminSidebarComponent onNavigate={() => setDrawerOpen(false)} />
          </Content>
        </Portal>
      </Root>

      {/* Main Content Area */}
      <main
        className="bg-foreground flex flex-1 flex-col lg:min-w-0 lg:pl-64"
        data-slot="layout-main"
      >
        <div className="grow" data-slot="layout-container">
          <div className="hf-page-shell flex min-h-full flex-col" data-slot="layout-inner">
            {/* Mobile Header Bar */}
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Button.Link size="md" className="-ml-2" iconOnly onClick={() => setDrawerOpen(true)}>
                <IconMenu />
              </Button.Link>

              <WorkspaceAccount
                className="!p-0 hover:!bg-transparent hover:!outline-none [&_[data-slot=avatar]]:h-9 [&_[data-slot=avatar]]:w-9"
                containerClassName="!p-0 border-none flex items-center"
                isNameVisible={false}
              />
            </div>

            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
