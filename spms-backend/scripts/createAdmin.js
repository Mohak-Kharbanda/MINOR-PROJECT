/**
 * Creates the first admin account. There is deliberately no public endpoint
 * for this. Reads FIRST_ADMIN_NAME / FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD
 * from the environment (or --name/--email/--password flags).
 *
 *   npm run create-admin
 *   npm run create-admin -- --email you@college.edu --name "Your Name" --password 'S0me-long-passphrase'
 *   npm run create-admin -- --force    # add another admin even if one exists
 */
import mongoose from "mongoose";
import { passwordSchema } from "@edutrack/shared";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = arg("name") || process.env.FIRST_ADMIN_NAME || "System Admin";
  const email = (arg("email") || process.env.FIRST_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = arg("password") || process.env.FIRST_ADMIN_PASSWORD || "";
  const force = process.argv.includes("--force");

  if (!email) throw new Error("Set FIRST_ADMIN_EMAIL (or pass --email).");
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) throw new Error(`FIRST_ADMIN_PASSWORD is not acceptable: ${pw.error.issues[0].message}`);
  if (password === "ChangeMe123!" || password === "change-me-Admin123") {
    throw new Error("Refusing to use the example password from .env.example. Pick your own.");
  }

  await connectDB();
  const existingAdmin = await User.exists({ role: "admin", isActive: true });
  if (existingAdmin && !force) {
    console.log("[create-admin] An active admin already exists — nothing to do. Use --force to add another admin.");
    return;
  }
  if (await User.exists({ email })) throw new Error(`A user with email ${email} already exists.`);

  const user = new User({ name, email, role: "admin" });
  await user.setPassword(password);
  await user.save();
  console.log(`[create-admin] Admin created: ${email}. Sign in and change the password if it was shared.`);
}

main()
  .catch((err) => {
    console.error(`[create-admin] ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
