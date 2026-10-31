import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.mail.configured) return null;
  if (!transporter) transporter = nodemailer.createTransport(env.mail.smtpUrl);
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an email when SMTP_URL is configured. Returns false when email is not
 * configured so callers can fall back (e.g. admin-generated reset links).
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({ from: env.mail.from, ...message });
  return true;
}
