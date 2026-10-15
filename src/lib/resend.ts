import { Resend } from "resend"
import { appEnv } from "./environment"
import { guardRecipient } from "./mail-guard"

function getResendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not set")
  return new Resend(key)
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "Lumen <noreply@resend.dev>"
}

// resend.emails.send() returns { data, error } rather than throwing, so a
// send failure (bad recipient, suspended domain, rate limit) looks
// identical to success unless the caller checks .error explicitly.
// Outside prod, mail goes only to NON_PROD_MAIL_TO or resend.dev test addresses (mail-guard.ts).
// Every value put into an email's HTML goes through this, including the links we build: names
// and family names are whatever a person typed, and sign-up mails one before anyone verifies it.
// Subjects are plain text and take the raw value.
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

async function send(params: { to: string; subject: string; html: string }) {
  const guarded = guardRecipient(params.to, params.subject)
  if (!guarded) {
    // The subject is left out: an invitation's names the inviter and the family.
    console.info(`[mail-guard] not sent (${appEnv()}) to ${params.to}`)
    return null
  }
  const resend = getResendClient()
  const { data, error } = await resend.emails.send({ from: getFromAddress(), ...params, ...guarded })
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`)
  }
  return data
}

export async function sendInviteEmail({
  to,
  inviterName,
  familyName,
  inviteUrl,
}: {
  to: string
  inviterName: string
  familyName: string
  inviteUrl: string
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You're invited to join ${escapeHtml(familyName)} on Lumen</h2>
      <p>${escapeHtml(inviterName)} has invited you to share gift lists with their family on Lumen.</p>
      <p>Click the button below to accept the invitation and start sharing your list.</p>
      <a href="${escapeHtml(inviteUrl)}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Accept Invitation
      </a>
      <p style="color: #666; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
    </div>
  `

  return send({ to, subject: `${inviterName} invited you to join ${familyName} on Lumen`, html })
}

export async function sendConfirmationEmail({
  to,
  name,
  confirmUrl,
}: {
  to: string
  name: string
  confirmUrl: string
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Confirm your Lumen account</h2>
      <p>Hi ${escapeHtml(name)}, click the button below to confirm your email and start sharing your list.</p>
      <a href="${escapeHtml(confirmUrl)}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Confirm your email
      </a>
      <p style="color: #666; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
    </div>
  `

  return send({ to, subject: "Confirm your Lumen account", html })
}

export async function sendAlreadyRegisteredEmail({
  to,
  resetUrl,
}: {
  to: string
  resetUrl: string
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You already have a Lumen account</h2>
      <p>Someone (hopefully you) just tried to sign up for Lumen with this email address, but an account already exists.</p>
      <p>If that was you and you forgot your password, click below to reset it. If you didn't request this, you can safely ignore this email.</p>
      <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Reset your password
      </a>
    </div>
  `

  return send({ to, subject: "You already have a Lumen account", html })
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string
  resetUrl: string
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your Lumen password</h2>
      <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
      <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Reset your password
      </a>
      <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>
  `

  return send({ to, subject: "Reset your Lumen password", html })
}
