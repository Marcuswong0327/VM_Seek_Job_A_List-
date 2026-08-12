export type MailConfig = {
  apiKey: string;
  from: string;
  to: string[];
};

function splitEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}

/** SRP: env bag → mail config. Returns null when email is not configured. */
export function parseMailConfig(env: NodeJS.Dict<string>): MailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM?.trim();
  const to = splitEmails(env.EMAIL_TO);
  if (!apiKey || !from || to.length === 0) return null;
  return { apiKey, from, to };
}
