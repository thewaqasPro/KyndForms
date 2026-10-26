import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'

import { RedisService, StatusService, SystemStatusReport } from '@service'

interface HealthResponse {
  status: 'ok' | 'down'
  service: 'kyndform-server'
  timestamp: string
  uptime: number
}

interface ReadinessResponse extends HealthResponse {
  checks: {
    mongo: 'up' | 'down'
    redis: 'up' | 'down'
  }
}

@Controller()
export class HealthController {
  constructor(
    private readonly redisService: RedisService,
    private readonly statusService: StatusService,
    @InjectConnection() private readonly mongoConnection: Connection
  ) {}

  @Get('/api/system/status')
  async systemStatus(): Promise<SystemStatusReport> {
    return this.statusService.getStatusReport()
  }

  @Get('/health')
  index(): HealthResponse {
    return {
      status: 'ok',
      service: 'kyndform-server',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    }
  }

  @Get('/health/ready')
  async ready(): Promise<ReadinessResponse> {
    let mongo: 'up' | 'down' = 'down'
    let redis: 'up' | 'down' = 'down'

    if (this.mongoConnection.readyState === 1) {
      mongo = 'up'
    }

    try {
      const pong = await this.redisService.ping()
      if (pong === 'PONG') {
        redis = 'up'
      }
    } catch (_) {}

    const response: ReadinessResponse = {
      status: mongo === 'up' && redis === 'up' ? 'ok' : 'down',
      service: 'kyndform-server',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
        mongo,
        redis
      }
    }

    if (response.status !== 'ok') {
      throw new ServiceUnavailableException(response)
    }

    return response
  }
}
