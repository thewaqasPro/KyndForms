import { Injectable } from '@nestjs/common'

import * as apps from '../apps'

@Injectable()
export class AppService {
  private readonly apps = apps
  private readonly appsById: Record<string, (typeof apps)[keyof typeof apps]>

  constructor() {
    this.appsById = Object.values(this.apps).reduce(
      (acc, app) => {
        if (app?.id) {
          acc[app.id] = app
        }
        return acc
      },
      {} as Record<string, (typeof apps)[keyof typeof apps]>
    )
  }

  findAll() {
    return Object.values(this.apps)
  }

  findById(id: string) {
    return this.appsById[id] || this.apps[id]
  }
}
