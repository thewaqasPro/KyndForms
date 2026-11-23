import * as nodemailer from 'nodemailer'

export interface SmtpOptions {
  host: string
  port: number
  user: string
  password: string
  secure: boolean
  servername?: string
  ignoreCert?: boolean
  pool?: boolean
  logger?: any
}

export interface SmtpMessage {
  from: string
  to: string
  subject: string
  html: string
}

const transportCache = new Map<string, nodemailer.Transporter>()

function getOrCreateTransport(options: SmtpOptions): nodemailer.Transporter {
  const cacheKey = `${options.host}:${options.port}:${options.user}:${options.secure}`
  let transport = transportCache.get(cacheKey)

  if (!transport) {
    const heloDomain =
      process.env.SMTP_HELO_DOMAIN ||
      (options.user && options.user.includes('@') ? options.user.split('@')[1] : 'kyndstudio.com')

    transport = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      name: heloDomain,
      auth: {
        user: options.user,
        pass: options.password
      },
      tls: {
        servername: options.servername,
        rejectUnauthorized: !(options.ignoreCert ?? false)
      },
      pool: options.pool ?? true,
      maxConnections: 1,
      maxMessages: 100,
      logger: options.logger
    } as any)

    transportCache.set(cacheKey, transport)
  }

  return transport
}

export async function smtpSendMail(
  options: SmtpOptions,
  message: SmtpMessage
): Promise<string | unknown> {
  const transport = getOrCreateTransport(options)
  const result = await transport.sendMail(message)
  return result.messageId
}
