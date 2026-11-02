import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function getTransporter() {
  if (!env.mail.configured) return null;
  if (!transporter) transporter = nodemailer.createTransport(env.mail.smtpUrl);
  return transporter;
}

/**
 * Sends an email when SMTP_URL is configured. Returns false when email is not
 * configured so callers can fall back (e.g. admin-generated reset links).
 */
export async function sendMail(message) {
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({ from: env.mail.from, ...message });
  return true;
}
