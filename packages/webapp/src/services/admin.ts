import { apollo } from '@/utils'

import {
  ADMIN_TOGGLE_USER_BLOCK_GQL,
  ADMIN_TOGGLE_USER_ROLE_GQL,
  ADMIN_USERS_GQL,
  SYSTEM_SETTINGS_GQL,
  UPDATE_SYSTEM_SETTINGS_GQL
} from '@/consts'

export interface SystemSettings {
  allowRegistration: boolean
  appLogoUrl?: string
  appName?: string
  maxFormsPerWorkspace?: number
  maxSubmissionsPerMonth?: number
  maxUploadFileSizeMB?: number
}

export interface AdminUserItem {
  id: string
  name: string
  email?: string
  avatar?: string
  isSystemAdmin?: boolean
  isBlocked?: boolean
  isEmailVerified?: boolean
  createdAt?: string
}

export class AdminService {
  static async getSystemSettings(): Promise<SystemSettings> {
    return apollo.query<SystemSettings>({
      query: SYSTEM_SETTINGS_GQL,
      fetchPolicy: 'network-only'
    })
  }

  static async updateSystemSettings(input: Partial<SystemSettings>): Promise<SystemSettings> {
    return apollo.mutate<SystemSettings>({
      mutation: UPDATE_SYSTEM_SETTINGS_GQL,
      variables: {
        input
      }
    })
  }

  static async getAdminUsers(options: {
    page: number
    limit: number
    keyword?: string
  }): Promise<{ users: AdminUserItem[]; total: number; page: number; limit: number }> {
    return apollo.query<{ users: AdminUserItem[]; total: number; page: number; limit: number }>({
      query: ADMIN_USERS_GQL,
      variables: options,
      fetchPolicy: 'network-only'
    })
  }

  static async toggleUserBlock(userId: string): Promise<boolean> {
    return apollo.mutate<boolean>({
      mutation: ADMIN_TOGGLE_USER_BLOCK_GQL,
      variables: {
        userId
      }
    })
  }

  static async toggleUserRole(userId: string): Promise<boolean> {
    return apollo.mutate<boolean>({
      mutation: ADMIN_TOGGLE_USER_ROLE_GQL,
      variables: {
        userId
      }
    })
  }

  static async getSystemStatus(): Promise<SystemStatusReport> {
    const res = await fetch('/api/system/status', {
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch system status: ${res.statusText}`)
    }
    return res.json()
  }
}

export interface SubsystemStatus {
  status: 'up' | 'down' | 'degraded'
  latencyMs?: number
  message?: string
  details?: Record<string, any>
}

export interface SystemStatusReport {
  status: 'operational' | 'degraded' | 'down'
  timestamp: string
  uptimeSeconds: number
  services: {
    database: SubsystemStatus
    redis: SubsystemStatus
    queues: SubsystemStatus
    mailer: SubsystemStatus
    storage: SubsystemStatus
  }
  integrations24h: {
    totalDelivered: number
    totalFailed: number
    successRate: number
    avgLatencyMs: number
  }
}
