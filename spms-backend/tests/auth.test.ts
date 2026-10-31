import { api, makeDepartment, makeUser, PASSWORD, XHR } from "./helpers";
import { User } from "../src/models/User";
import { env } from "../src/config/env";

function refreshCookie(res: any): string {
  const cookies: string[] = res.headers["set-cookie"] || [];
  const c = cookies.find((x) => x.startsWith("edutrack_rt="));
  if (!c) throw new Error("no refresh cookie");
  return c.split(";")[0];
}

describe("registration", () => {
  it("creates a student account, returns an access token and sets an httpOnly refresh cookie", async () => {
    const dept = await makeDepartment();
    const res = await api().post("/api/auth/register").send({
      name: "Asha Student", email: "Asha@Test.local", password: PASSWORD, usn: "1CS001", department: dept.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ email: "asha@test.local", role: "student" });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("edutrack_rt="))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
  });

  it("ignores a smuggled role field — public signup can never create faculty or admins", async () => {
    const dept = await makeDepartment();
    const res = await api().post("/api/auth/register").send({
      name: "Sneaky", email: "sneaky@test.local", password: PASSWORD, usn: "1CS002", department: dept.id, role: "admin",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("student");
    expect((await User.findOne({ email: "sneaky@test.local" }))!.role).toBe("student");
  });

  it("rejects weak passwords and duplicate emails with useful messages", async () => {
    const dept = await makeDepartment();
    const weak = await api().post("/api/auth/register").send({ name: "Weak", email: "weak@test.local", password: "short", usn: "1CS003", department: dept.id });
    expect(weak.status).toBe(400);
    expect(weak.body.message).toMatch(/at least 8/);

    const { user } = await makeUser("student");
    const dup = await api().post("/api/auth/register").send({ name: "Dup", email: user.email, password: PASSWORD, usn: "1CS004", department: dept.id });
    expect(dup.status).toBe(409);
  });

  it("can be switched off by the administrator", async () => {
    const dept = await makeDepartment();
    env.allowStudentSignup = false;
    try {
      const res = await api().post("/api/auth/register").send({ name: "Late", email: "late@test.local", password: PASSWORD, usn: "1CS005", department: dept.id });
      expect(res.status).toBe(403);
    } finally {
      env.allowStudentSignup = true;
    }
  });
});

describe("login and sessions", () => {
  it("logs in with correct credentials and rejects wrong ones without revealing which part was wrong", async () => {
    const { user } = await makeUser("faculty");
    const okRes = await api().post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.user.role).toBe("faculty");

    const bad = await api().post("/api/auth/login").send({ email: user.email, password: "Wrong12345" });
    const unknown = await api().post("/api/auth/login").send({ email: "nobody@test.local", password: "Wrong12345" });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.message).toBe(unknown.body.message);
  });

  it("blocks deactivated accounts from logging in", async () => {
    const { user } = await makeUser("student", { isActive: false });
    const res = await api().post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });

  it("protects /auth/me with a bearer token", async () => {
    expect((await api().get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/auth/me").set("Authorization", "Bearer not-a-jwt")).status).toBe(401);
    const { auth, user } = await makeUser("student");
    const res = await api().get("/api/auth/me").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
  });

  it("refreshes the session from the cookie (CSRF header required) and rotates the cookie", async () => {
    const { user } = await makeUser("student");
    const login = await api().post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    const cookie = refreshCookie(login);

    expect((await api().post("/api/auth/refresh").set("Cookie", cookie)).status).toBe(403);
    expect((await api().post("/api/auth/refresh").set(XHR)).status).toBe(401);

    const res = await api().post("/api/auth/refresh").set(XHR).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).toMatch(/^edutrack_rt=/);
  });

  it("changing the password revokes existing tokens", async () => {
    const { user, auth } = await makeUser("student");
    const res = await api().post("/api/auth/change-password").set(auth).send({ currentPassword: PASSWORD, newPassword: "NewPassword456" });
    expect(res.status).toBe(200);
    expect((await api().get("/api/auth/me").set(auth)).status).toBe(401);
    expect((await api().get("/api/auth/me").set("Authorization", `Bearer ${res.body.data.accessToken}`)).status).toBe(200);
    expect((await api().post("/api/auth/login").send({ email: user.email, password: "NewPassword456" })).status).toBe(200);
  });

  it("logout-all revokes every session", async () => {
    const { auth } = await makeUser("student");
    expect((await api().post("/api/auth/logout-all").set(auth)).status).toBe(200);
    expect((await api().get("/api/auth/me").set(auth)).status).toBe(401);
  });
});

describe("password reset", () => {
  it("returns the same generic answer for known and unknown emails", async () => {
    const { user } = await makeUser("student");
    const known = await api().post("/api/auth/forgot-password").send({ email: user.email });
    const unknown = await api().post("/api/auth/forgot-password").send({ email: "ghost@test.local" });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
  });

  it("resets the password with a one-time link generated by an admin", async () => {
    const admin = await makeUser("admin");
    const { user, auth: oldAuth } = await makeUser("student");
    const linkRes = await api().post(`/api/users/${user.id}/reset-link`).set(admin.auth);
    expect(linkRes.status).toBe(200);
    const token = new URL(linkRes.body.data.link).searchParams.get("token")!;

    const reset = await api().post("/api/auth/reset-password").send({ token, newPassword: "BrandNew789" });
    expect(reset.status).toBe(200);
    expect((await api().get("/api/auth/me").set(oldAuth)).status).toBe(401);
    expect((await api().post("/api/auth/login").send({ email: user.email, password: "BrandNew789" })).status).toBe(200);

    const reuse = await api().post("/api/auth/reset-password").send({ token, newPassword: "Another1234" });
    expect(reuse.status).toBe(400);
  });
});

describe("first admin bootstrap", () => {
  it("creates the first admin from FIRST_ADMIN_* only when no admin exists", async () => {
    const { bootstrapFirstAdmin } = await import("../src/services/bootstrap");
    const original = { ...env.firstAdmin };
    Object.assign(env.firstAdmin, { name: "Boot Admin", email: "boot@test.local", password: "Bootstrap123" });
    try {
      await bootstrapFirstAdmin();
      expect(await User.countDocuments({ role: "admin" })).toBe(1);
      expect((await api().post("/api/auth/login").send({ email: "boot@test.local", password: "Bootstrap123" })).status).toBe(200);

      Object.assign(env.firstAdmin, { email: "second@test.local" });
      await bootstrapFirstAdmin();
      expect(await User.countDocuments({ role: "admin" })).toBe(1);
    } finally {
      Object.assign(env.firstAdmin, original);
    }
  });
});
