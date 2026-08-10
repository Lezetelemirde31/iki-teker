import "server-only";

/**
 * Sending the one-time code by email.
 *
 * Deliberately the same shape as `sms.ts`: an interface with one implementation
 * chosen from the environment. Codes themselves know nothing about either — a
 * destination is a phone or an address, and the only difference is who carries
 * the message.
 *
 * Email exists because SMS cannot. A message provider here needs a registered
 * legal entity in Azerbaijan; an email provider needs an account and a domain,
 * which is a smaller thing to be blocked on. Until one is configured this runs
 * in **demo mode** and shows the code to whoever asked for it, which is fine on
 * a machine being worked on and is refused in production — see `demoAuthAllowed`.
 */

export type EmailResult = { sent: true } | { sent: false; reason: string };

export interface EmailSender {
  readonly name: string;
  send(to: string, subject: string, body: string): Promise<EmailResult>;
}

/** Logs instead of sending. The code reaches the terminal. */
const consoleSender: EmailSender = {
  name: "console",
  async send(to, subject, body) {
    console.log(`\n  [email → ${to}] ${subject}\n  ${body}\n`);
    return { sent: true };
  },
};

/**
 * Resend, over its HTTP API rather than its SDK.
 *
 * One `fetch` against one documented endpoint is smaller than the dependency,
 * and swapping providers later means rewriting this function and nothing else.
 */
function resendSender(apiKey: string, from: string): EmailSender {
  return {
    name: "resend",
    async send(to, subject, text) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ from, to: [to], subject, text }),
        });

        if (response.ok) return { sent: true };

        // The status alone is not enough to act on. A 403 can mean an
        // unverified domain, a key scoped to a different one, or a sender
        // address the account does not own — three different fixes. Resend
        // says which in the body, so the body is what gets logged.
        const detail = await response.text().catch(() => "");
        return { sent: false, reason: `resend ${response.status}: ${detail.slice(0, 300)}` };
      } catch (error) {
        // A provider having a bad minute must not throw out of sign-in; the
        // caller turns a false into "could not send", which is the truth.
        return { sent: false, reason: String(error) };
      }
    },
  };
}

export function emailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (apiKey && from) return resendSender(apiKey, from);
  return consoleSender;
}

/** True when no real provider is configured. */
export function isDemoEmail(): boolean {
  return emailSender().name === "console";
}

/**
 * Rough shape check, not validation.
 *
 * Nothing short of sending to it proves an address exists, and sending is
 * exactly what happens next — so this only rejects what obviously could not be
 * an address, and lets the code delivery decide the rest.
 */
export function normaliseEmail(input: string): string | undefined {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return undefined;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)) return undefined;
  return trimmed;
}
