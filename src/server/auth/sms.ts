import "server-only";

/**
 * Sending the one-time code.
 *
 * No SMS contract exists yet — it needs a registered legal entity — so this is
 * an interface with one implementation behind it. When a provider is signed,
 * that is a new `send` function and an environment variable; nothing else in
 * the auth module changes.
 *
 * Without a provider the app runs in **demo mode**: the code is shown to
 * whoever asked for it. That is deliberately not something production can do by
 * accident — see `demoAuthAllowed` below.
 */

export type SmsResult = { sent: true } | { sent: false; reason: string };

export interface SmsSender {
  readonly name: string;
  send(to: string, message: string): Promise<SmsResult>;
}

/**
 * Logs instead of sending.
 *
 * The code reaches the terminal, which is enough to work on sign-in locally
 * without an account anywhere.
 */
const consoleSender: SmsSender = {
  name: "console",
  async send(to, message) {
    console.log(`\n  [sms → ${to}] ${message}\n`);
    return { sent: true };
  },
};

export function smsSender(): SmsSender {
  // Real providers slot in here, chosen by environment. Each one is a small
  // adapter around the same two-argument send.
  //
  //   if (process.env.SMS_PROVIDER === "twilio") return twilioSender();
  //   if (process.env.SMS_PROVIDER === "atltelekom") return atlSender();
  //
  return consoleSender;
}

/** True when no real provider is configured. */
export function isDemoAuth(): boolean {
  return smsSender().name === "console";
}

/**
 * Whether demo sign-in may run at all.
 *
 * In demo mode the code is returned to the caller, which means anyone who knows
 * a phone number can sign in as its owner. That is acceptable on a prototype
 * being shown to a client and unacceptable anywhere real, so production has to
 * say so out loud rather than inheriting it by forgetting to configure a
 * provider.
 */
export function demoAuthAllowed(): boolean {
  if (!isDemoAuth()) return true;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_DEMO_AUTH === "1";
}
