import { Resend } from 'resend'

// Lazily constructed: the Resend SDK throws at construction time when given an
// empty API key, so building it eagerly would crash every environment without
// RESEND_API_KEY as soon as this module is imported.
let resend: Resend | null = null

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }

  return resend
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? 'Crisol <noreply@crisol.app>'

  // Without an API key (local dev) there is no way to deliver the email: log it
  // instead, so the verification / reset link can still be opened by hand.
  if (!process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn(`[email] RESEND_API_KEY not set — skipping email "${subject}" to ${to}\n${html}`)

    return
  }

  await getResendClient().emails.send({ from, to, subject, html })
}

/** Wraps a call-to-action email body in the Crisol look (dark card + yellow button). */
export function renderActionEmail({
  title,
  intro,
  actionLabel,
  actionUrl,
  footer
}: {
  title: string
  intro: string
  actionLabel: string
  actionUrl: string
  footer: string
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background:#1a110c; color:#f4e7cc; padding:32px; border:2px solid #a8793a; border-radius:4px;">
      <h2 style="margin-top:0;color:#e8b85a;font-family:Georgia, serif;letter-spacing:1px;">${title}</h2>
      <p style="line-height:1.5;">${intro}</p>
      <a href="${actionUrl}" style="display:inline-block;padding:14px 28px;background:#e8b85a;color:#2a1404;border:1px solid #3a2208;border-radius:3px;text-decoration:none;font-weight:bold;letter-spacing:1px;">
        ${actionLabel}
      </a>
      <p style="margin-top:24px;color:#b8a07a;font-size:13px;">${footer}</p>
    </div>
  `
}
