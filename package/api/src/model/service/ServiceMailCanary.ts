import tls from 'node:tls'
import { Service } from '@datacapy/server'
import { ImapFlow } from 'imapflow'
import { genUniqueId } from '@datacapy/id'
import { captureWithFingerprint } from 'common'
import { ServiceEmail } from './ServiceEmail'

export interface MailCanaryResult {
  delivered: boolean
  elapsedMs: number
}

export class ServiceMailCanary extends Service {
  constructor() {
    super({ name: 'mailCanary' })
  }

  async run(): Promise<MailCanaryResult> {
    const mailConfig = this.config.model.app.mail
    const canaryConfig = mailConfig.canary
    const imapConfig = mailConfig.imap

    if (!canaryConfig?.to || !canaryConfig?.user || !canaryConfig?.pass) {
      // The task is enabled and running, so it is meant to be configured —
      // silently reporting "delivered: false" forever is how a broken canary
      // hides. Surface it (once per episode) without failing the execution.
      this.logger.log('[MailCanary] Not configured, skipping')
      captureWithFingerprint(
        ['mail-canary-not-configured'],
        new Error(
          '[MailCanary] task is enabled but the canary mailbox is not configured',
        ),
      )
      return { delivered: false, elapsedMs: 0 }
    }

    const token = genUniqueId()
    const startedAt = Date.now()

    await this.getService<ServiceEmail>('email').send({
      type: 'mail-canary',
      to: canaryConfig.to,
      subject: `[VeySur Canary] ${token}`,
      text: `Mail deliverability canary probe ${token}`,
    })

    // IMAP connect/fetch failure (unreachable relay, TLS handshake abort, cert
    // drift) propagates as a raw throw. ServiceTaskManager records it and
    // escalates to BugSink once the task has failed twice in a row — a single
    // failed run is not alerted (it is usually a transient blip).
    const delivered = await this._pollForToken({
      host: imapConfig.host,
      port: imapConfig.port,
      user: canaryConfig.user,
      pass: canaryConfig.pass,
      caCert: imapConfig.caCert,
      token,
      timeoutSeconds: canaryConfig.timeoutSeconds,
      pollIntervalSeconds: canaryConfig.pollIntervalSeconds,
    })

    const elapsedMs = Date.now() - startedAt

    if (!delivered) {
      throw new Error(
        `[MailCanary] Probe ${token} not confirmed delivered within ${canaryConfig.timeoutSeconds}s`,
      )
    }

    this.logger.log(
      `[MailCanary] Probe ${token} confirmed delivered in ${elapsedMs}ms`,
    )

    return { delivered: true, elapsedMs }
  }

  private async _pollForToken({
    host,
    port,
    user,
    pass,
    caCert,
    token,
    timeoutSeconds,
    pollIntervalSeconds,
  }: {
    host: string
    port: number
    user: string
    pass: string
    caCert: string | null
    token: string
    timeoutSeconds: number
    pollIntervalSeconds: number
  }): Promise<boolean> {
    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth: { user, pass },
      logger: false,
      // Without these, a black-holed relay hangs until the task-manager kills the
      // execution at the 10-minute task limit (and starves the single execution slot).
      connectionTimeout: 20_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      ...(caCert
        ? {
            tls: {
              ca: [Buffer.from(caCert, 'base64').toString('utf8')],
              checkServerIdentity: (
                _hostname: string,
                cert: tls.PeerCertificate,
              ) => tls.checkServerIdentity(host, cert),
            },
          }
        : {}),
    })

    const deadline = Date.now() + timeoutSeconds * 1000

    try {
      await client.connect()

      while (Date.now() < deadline) {
        const lock = await client.getMailboxLock('INBOX', {
          acquireTimeout: 30_000,
        })
        let matchedUid: number | null = null

        try {
          for await (const msg of client.fetch(
            '1:*',
            { envelope: true },
            { uid: true },
          )) {
            if (msg.envelope?.subject?.includes(token)) {
              matchedUid = msg.uid
              break
            }
          }
        } finally {
          lock.release()
        }

        if (matchedUid !== null) {
          await client.messageDelete(matchedUid, { uid: true })
          return true
        }

        const remainingMs = deadline - Date.now()
        if (remainingMs <= 0) break
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.min(pollIntervalSeconds * 1000, remainingMs),
          ),
        )
      }

      return false
    } finally {
      await client.logout().catch(() => {})
    }
  }
}

export default ServiceMailCanary
