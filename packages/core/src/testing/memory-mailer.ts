import type { MailMessage, Mailer } from '../mailer'

export class MemoryMailer implements Mailer {
  readonly messages: MailMessage[] = []

  async send(message: MailMessage): Promise<void> {
    this.messages.push(message)
  }

  lastTo(email: string): MailMessage {
    const message = [...this.messages].reverse().find((entry) => entry.to === email)

    if (!message) {
      throw new Error(`No email sent to ${email}`)
    }

    return message
  }
}

export function extractInviteToken(text: string): string {
  const match = text.match(/\/invite\/([A-Za-z0-9_-]+)/)

  if (!match?.[1]) {
    throw new Error('Invite token not found in email')
  }

  return match[1]
}

export function extractResetToken(text: string): string {
  const match = text.match(/[?&]token=([A-Za-z0-9_-]+)/)

  if (!match?.[1]) {
    throw new Error('Reset token not found in email')
  }

  return match[1]
}
