import { apollo } from '@/utils'

import { APPS_GQL } from '@/consts'
import { AppType } from '@/types'

export class AppService {
  static async apps(): Promise<AppType[]> {
    return apollo.query({
      query: APPS_GQL
    })
  }

  static async detail(clientId?: string, _redirectUri?: string): Promise<AppType | undefined> {
    const list = await this.apps()
    return list?.find((item: AppType) => item.id === clientId)
  }

  static async authorizationCode(clientId?: string, redirectUri?: string): Promise<string> {
    const separator = redirectUri?.includes('?') ? '&' : '?'
    return `${redirectUri || ''}${separator}code=auth_${clientId || ''}`
  }
}
