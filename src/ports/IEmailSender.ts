export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type EmailMessage = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments: EmailAttachment[];
};

export type EmailSendResult = {
  id: string;
};

/** DIP: application depends on this port, not Resend. */
export interface IEmailSender {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
