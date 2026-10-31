import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User, BCRYPT_ROUNDS, type UserDoc } from "../models/User";
import { Department } from "../models/Department";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/http";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { env } from "../config/env";
import { audit } from "../services/audit";
import { toUserDTO } from "../services/serializers";
import { sendMail } from "../services/mailer";
import { hashToken, issueResetToken, RESET_TOKEN_TTL_MINUTES } from "../services/passwordReset";

export const REFRESH_COOKIE = "edutrack_rt";
const REFRESH_COOKIE_PATH = "/api/auth";

// Used to keep login timing the same whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer-password", BCRYPT_ROUNDS);

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: REFRESH_COOKIE_PATH,
  } as const;
}

function issueSession(res: Response, user: UserDoc) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
  const refreshToken = signRefreshToken({ sub: user.id, tv: user.tokenVersion });
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

async function withDepartment(user: UserDoc) {
  await user.populate("department", "name code");
  return toUserDTO(user);
}

// Public registration creates student accounts only. Faculty and admin
// accounts are provisioned by an admin (POST /api/users). Any "role" field in
// the body is stripped by the schema, so it cannot be smuggled in.
export const register = asyncHandler(async (req: Request, res: Response) => {
  if (!env.allowStudentSignup) {
    throw ApiError.forbidden("Self-registration is disabled. Ask your administrator for an account.");
  }
  const { name, email, password, usn, department } = req.body;

  if (await User.exists({ email })) throw ApiError.conflict("An account with this email already exists.");
  if (await User.exists({ usn })) throw ApiError.conflict("An account with this student ID already exists.");
  if (!(await Department.exists({ _id: department }))) throw ApiError.badRequest("Selected department does not exist.");

  const user = new User({ name, email, usn, department, role: "student" });
  await user.setPassword(password);
  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = issueSession(res, user);
  await audit(req, { action: "auth.register", summary: `${name} registered as a student`, targetType: "User", targetId: user._id }, { id: user.id, role: "student" });

  created(res, { accessToken, user: await withDepartment(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+passwordHash");

  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) throw ApiError.unauthorized("Invalid email or password.");
  if (!user.isActive) throw ApiError.forbidden("This account has been deactivated. Contact your administrator.");

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = issueSession(res, user);
  ok(res, { accessToken, user: await withDepartment(user) });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized("No active session.");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    throw ApiError.unauthorized("Your session is no longer valid. Please sign in again.");
  }

  // Rotate the refresh token on every use.
  const accessToken = issueSession(res, user);
  ok(res, { accessToken, user: await withDepartment(user) });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  ok(res, null, { message: "Signed out." });
});

/** Revokes every session for this user (all devices) by bumping tokenVersion. */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await User.updateOne({ _id: req.user!.id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  ok(res, null, { message: "Signed out of all devices." });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).populate("department", "name code");
  if (!user) throw ApiError.notFound("User not found.");
  ok(res, { user: toUserDTO(user) });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound("User not found.");
  user.name = req.body.name;
  await user.save();
  ok(res, { user: await withDepartment(user) }, { message: "Profile updated." });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user!.id).select("+passwordHash");
  if (!user) throw ApiError.notFound("User not found.");
  if (!(await user.comparePassword(currentPassword))) throw ApiError.badRequest("Current password is incorrect.");
  if (currentPassword === newPassword) throw ApiError.badRequest("Choose a password different from the current one.");

  await user.setPassword(newPassword);
  user.tokenVersion += 1; // sign out every other session
  await user.save();
  await audit(req, { action: "auth.change_password", summary: "Changed their password", targetType: "User", targetId: user._id });

  const accessToken = issueSession(res, user);
  ok(res, { accessToken }, { message: "Password updated. Other sessions have been signed out." });
});

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, a password reset link is on its way. If email is not set up for this site, ask your administrator for a reset link.";

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email, isActive: true });
  if (user) {
    const { link } = issueResetToken(user);
    await user.save();
    const sent = await sendMail({
      to: user.email,
      subject: "Reset your EduTrack password",
      text: `Hi ${user.name},\n\nUse this link to choose a new password (valid for ${RESET_TOKEN_TTL_MINUTES} minutes):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    }).catch(() => false);
    if (!sent && !env.isProduction && !env.isTest) {
      // eslint-disable-next-line no-console
      console.log(`[auth] email not configured — reset link for ${user.email}: ${link}`);
    }
    await audit(req, { action: "auth.forgot_password", summary: `Password reset requested for ${user.email}`, targetType: "User", targetId: user._id }, { id: user.id, role: user.role });
  }
  // Same response either way, so the endpoint cannot be used to discover accounts.
  ok(res, { emailConfigured: env.mail.configured }, { message: GENERIC_RESET_MESSAGE });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires");
  if (!user || !user.isActive) throw ApiError.badRequest("This reset link is invalid or has expired.");

  await user.setPassword(newPassword);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.tokenVersion += 1;
  await user.save();
  await audit(req, { action: "auth.reset_password", summary: `Password reset completed for ${user.email}`, targetType: "User", targetId: user._id }, { id: user.id, role: user.role });

  ok(res, null, { message: "Password updated. You can now sign in with your new password." });
});
