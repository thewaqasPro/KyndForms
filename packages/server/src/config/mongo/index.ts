import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose'
import * as mongoose from 'mongoose'

import { MONGO_PASSWORD, MONGO_SSL_CA_PATH, MONGO_URI, MONGO_USER, NODE_ENV } from '@environments'
import { Logger } from '@utils'

const logger = new Logger('MongooseModule')
const SENSITIVE_MONGO_KEY = /authorization|cookie|password|secret|token/i

export function redactMongoLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) {
    return value.map(item => redactMongoLogValue(item, seen))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  if (seen.has(value)) {
    return '[Circular]'
  }

  seen.add(value)
  const redacted: Record<string, unknown> = {}

  for (const [key, item] of Object.entries(value)) {
    redacted[key] = SENSITIVE_MONGO_KEY.test(key) ? '******' : redactMongoLogValue(item, seen)
  }

  seen.delete(value)
  return redacted
}

// Database query logging is useful locally but both sensitive and noisy in production. Redact
// every argument in development, including dotted update keys such as `settings.password`.
mongoose.set(
  'debug',
  NODE_ENV === 'development'
    ? (collection: string, method: string, ...args: any[]) => {
        logger.info(
          [
            collection,
            method,
            ...args.map(arg => (arg !== undefined ? JSON.stringify(redactMongoLogValue(arg)) : ''))
          ]
            .filter(Boolean)
            .join(' ')
        )
      }
    : false
)

export class MongoService implements MongooseOptionsFactory {
  createMongooseOptions(): Promise<MongooseModuleOptions> | MongooseModuleOptions {
    const options: any = {
      uri: MONGO_URI,
      user: MONGO_USER,
      pass: MONGO_PASSWORD
    }

    if (MONGO_SSL_CA_PATH) {
      options.sslCA = MONGO_SSL_CA_PATH
    }

    return options
  }
}
