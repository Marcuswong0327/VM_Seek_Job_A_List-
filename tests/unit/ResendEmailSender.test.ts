import { describe, expect, it, vi } from 'vitest';
import { ResendEmailSender } from '../../src/email/ResendEmailSender.js';
import type { EmailMessage } from '../../src/ports/IEmailSender.js';

describe('ResendEmailSender', () => {
  it('POSTs the Resend emails API with bearer auth and base64 attachment', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'email_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const sender = new ResendEmailSender({
      apiKey: 're_test_key',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const message: EmailMessage = {
      from: 'Seek Jobs <jobs@example.com>',
      to: ['a@consult.co'],
      subject: 'Seek job listings',
      html: '<p>ok</p>',
      attachments: [
        {
          filename: 'report.xlsx',
          content: Buffer.from('xlsx-bytes'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    };

    const result = await sender.send(message);

    expect(result.id).toBe('email_123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
    });

    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.from).toBe(message.from);
    expect(body.to).toEqual(['a@consult.co']);
    expect(body.subject).toBe('Seek job listings');
    expect(body.html).toBe('<p>ok</p>');
    expect(body.attachments[0].filename).toBe('report.xlsx');
    expect(body.attachments[0].content).toBe(Buffer.from('xlsx-bytes').toString('base64'));
  });

  it('throws when Resend returns an error payload', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'Invalid API key' }), { status: 401 })
    );
    const sender = new ResendEmailSender({
      apiKey: 'bad',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      sender.send({
        from: 'a@b.com',
        to: ['c@d.com'],
        subject: 'x',
        html: '<p>x</p>',
        attachments: [],
      })
    ).rejects.toThrow(/Invalid API key/);
  });
});
