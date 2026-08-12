import { describe, expect, it } from 'vitest';
import { parseMailConfig } from '../../src/email/MailConfig.js';

describe('parseMailConfig', () => {
  it('reads Resend key, from, and comma-separated recipients', () => {
    const config = parseMailConfig({
      RESEND_API_KEY: 're_123',
      RESEND_FROM: 'Seek Jobs <jobs@example.com>',
      EMAIL_TO: 'a@consult.co, b@consult.co',
    });

    expect(config).toEqual({
      apiKey: 're_123',
      from: 'Seek Jobs <jobs@example.com>',
      to: ['a@consult.co', 'b@consult.co'],
    });
  });

  it('returns null when required fields are missing', () => {
    expect(parseMailConfig({ RESEND_API_KEY: 're_123' })).toBeNull();
    expect(parseMailConfig({})).toBeNull();
  });
});
