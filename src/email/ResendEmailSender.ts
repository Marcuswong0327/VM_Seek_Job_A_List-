import type { EmailMessage, EmailSendResult, IEmailSender } from '../ports/IEmailSender.js';

export type ResendEmailSenderOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
};

/** Adapter: IEmailSender → Resend HTTP API. */
export class ResendEmailSender implements IEmailSender {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor(options: ResendEmailSenderOptions) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? 'https://api.resend.com/emails';
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        attachments: message.attachments.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
          content_type: a.contentType,
        })),
      }),
    });

    const raw = await response.text();
    let payload: { id?: string; message?: string; name?: string } = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { message: raw };
    }

    if (!response.ok || !payload.id) {
      throw new Error(payload.message || `Resend error ${response.status}`);
    }

    return { id: payload.id };
  }
}
