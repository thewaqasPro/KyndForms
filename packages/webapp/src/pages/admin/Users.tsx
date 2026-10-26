import {
  IconSearch,
  IconShield,
  IconShieldOff,
  IconUserCheck,
  IconUserX
} from '@tabler/icons-react'
import { useRequest } from 'ahooks'
import { useEffect, useState } from 'react'

import { AdminService, AdminUserItem } from '@/services/admin'

import { Avatar, Button, Input } from '@/components'
import { useUserStore } from '@/store'

import { AdminLayout } from './AdminLayout'

export default function AdminUsers() {
  const { user: currentUser } = useUserStore()
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [keyword, setKeyword] = useState('')

  const { loading, run: fetchUsers } = useRequest(
    async (p = page, q = keyword) => {
      const res = await AdminService.getAdminUsers({
        page: p,
        limit,
        keyword: q || undefined
      })
      setUsers(res.users)
      setTotal(res.total)
      setPage(res.page)
    },
    {
      manual: true
    }
  )

  useEffect(() => {
    fetchUsers(1, keyword)
  }, [keyword])

  const handleToggleBlock = async (targetUser: AdminUserItem) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot block your own administrator account.')
      return
    }

    const action = targetUser.isBlocked ? 'unblock' : 'block'
    if (!confirm(`Are you sure you want to ${action} user "${targetUser.name}"?`)) {
      return
    }

    await AdminService.toggleUserBlock(targetUser.id)
    fetchUsers(page, keyword)
  }

  const handleToggleRole = async (targetUser: AdminUserItem) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot change your own administrator role.')
      return
    }

    const action = targetUser.isSystemAdmin
      ? 'revoke administrator privileges from'
      : 'grant administrator privileges to'
    if (!confirm(`Are you sure you want to ${action} "${targetUser.name}"?`)) {
      return
    }

    await AdminService.toggleUserRole(targetUser.id)
    fetchUsers(page, keyword)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="border-accent-light flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="hf-page-title">User Governance</h1>
            <p className="text-secondary mt-1 text-sm">
              View registered users, manage system administrator privileges, and enforce access
              blocks.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <Input
              value={keyword}
              placeholder="Search by name or email..."
              leading={<IconSearch className="text-secondary h-4 w-4" />}
              onChange={val => setKeyword(val)}
            />
          </div>
        </div>

        <div className="hf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-accent-light bg-accent/30 text-secondary border-b text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Joined</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-accent-light divide-y">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-secondary px-6 py-12 text-center">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-secondary px-6 py-12 text-center">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  users.map(u => {
                    const isSelf = u.id === currentUser?.id
                    return (
                      <tr key={u.id} className="hover:bg-accent-light/50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={u.avatar}
                              fallback={u.name}
                              className="h-9 w-9 rounded-full"
                              resize={{ width: 80, height: 80 }}
                            />
                            <div>
                              <div className="text-primary flex items-center gap-1.5 font-medium">
                                {u.name}
                                {isSelf && (
                                  <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="text-secondary whitespace-nowrap px-6 py-4">
                          {u.email || '—'}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {u.isSystemAdmin ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                              <IconShield className="h-3 w-3" />
                              System Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                              Standard User
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {u.isBlocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                              Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="text-secondary whitespace-nowrap px-6 py-4 text-xs">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button.Ghost
                              size="sm"
                              disabled={isSelf}
                              title={u.isSystemAdmin ? 'Revoke Admin' : 'Make Admin'}
                              onClick={() => handleToggleRole(u)}
                            >
                              {u.isSystemAdmin ? (
                                <>
                                  <IconShieldOff className="mr-1 h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  Demote
                                </>
                              ) : (
                                <>
                                  <IconShield className="mr-1 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  Make Admin
                                </>
                              )}
                            </Button.Ghost>

                            <Button.Ghost
                              size="sm"
                              disabled={isSelf}
                              title={u.isBlocked ? 'Unblock Account' : 'Block Account'}
                              onClick={() => handleToggleBlock(u)}
                            >
                              {u.isBlocked ? (
                                <>
                                  <IconUserCheck className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  Unblock
                                </>
                              ) : (
                                <>
                                  <IconUserX className="mr-1 h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                                  Block
                                </>
                              )}
                            </Button.Ghost>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-accent-light text-secondary flex items-center justify-between border-t px-6 py-3.5 text-xs">
            <div>Total Registered Users: {total}</div>
            <div className="flex items-center gap-2">
              <Button.Ghost
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => fetchUsers(page - 1, keyword)}
              >
                Previous
              </Button.Ghost>
              <span>
                Page {page} of {Math.max(1, Math.ceil(total / limit))}
              </span>
              <Button.Ghost
                size="sm"
                disabled={page * limit >= total || loading}
                onClick={() => fetchUsers(page + 1, keyword)}
              >
                Next
              </Button.Ghost>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
