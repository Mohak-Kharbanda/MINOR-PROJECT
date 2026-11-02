import { passwordSchema } from "@edutrack/shared";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

/**
 * Creates the first admin from FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD when
 * the database has no admin at all — handy on hosts without shell access.
 * It never runs once any admin exists, so leaving the variables set is safe,
 * but you should remove FIRST_ADMIN_PASSWORD after the first successful boot.
 */
export async function bootstrapFirstAdmin() {
  const { email, password, name } = env.firstAdmin;
  if (!email || !password) return;
  if (await User.exists({ role: "admin" })) return;

  if (!passwordSchema.safeParse(password).success) {
    // eslint-disable-next-line no-console
    console.warn("[bootstrap] FIRST_ADMIN_PASSWORD does not meet the password policy (8+ chars, letters and numbers); admin not created.");
    return;
  }
  if (await User.exists({ email })) {
    // eslint-disable-next-line no-console
    console.warn(`[bootstrap] ${email} already exists as a non-admin user; admin not created.`);
    return;
  }
  const user = new User({ name, email, role: "admin" });
  await user.setPassword(password);
  await user.save();
  // eslint-disable-next-line no-console
  console.log(`[bootstrap] Created first admin ${email}. Remove FIRST_ADMIN_PASSWORD from the environment now.`);
}
