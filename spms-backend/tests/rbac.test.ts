import { api, makeDepartment, makeUser, scenario } from "./helpers";
import { AuditLog } from "../src/models/AuditLog";

describe("role-based access control", () => {
  it("only admins can list or create users", async () => {
    const student = await makeUser("student");
    const faculty = await makeUser("faculty");
    const admin = await makeUser("admin");

    expect((await api().get("/api/users").set(student.auth)).status).toBe(403);
    expect((await api().get("/api/users").set(faculty.auth)).status).toBe(403);
    const list = await api().get("/api/users?role=student").set(admin.auth);
    expect(list.status).toBe(200);
    expect(list.body.pagination).toMatchObject({ page: 1, total: 1 });

    const escalate = await api().post("/api/users").set(student.auth).send({ name: "Evil", email: "evil@test.local", role: "admin", password: "Password123" });
    expect(escalate.status).toBe(403);
  });

  it("admins provision faculty accounts and get a one-time temporary password", async () => {
    const admin = await makeUser("admin");
    const dept = await makeDepartment();
    const res = await api().post("/api/users").set(admin.auth).send({ name: "New Prof", email: "prof@test.local", role: "faculty", department: dept.id });
    expect(res.status).toBe(201);
    expect(res.body.data.temporaryPassword).toEqual(expect.any(String));
    const login = await api().post("/api/auth/login").send({ email: "prof@test.local", password: res.body.data.temporaryPassword });
    expect(login.status).toBe(200);
    expect(await AuditLog.countDocuments({ action: "admin.create_user" })).toBe(1);
  });

  it("a deactivated user's existing token stops working immediately", async () => {
    const admin = await makeUser("admin");
    const student = await makeUser("student");
    expect((await api().get("/api/auth/me").set(student.auth)).status).toBe(200);
    expect((await api().post(`/api/users/${student.user.id}/deactivate`).set(admin.auth)).status).toBe(200);
    expect((await api().get("/api/auth/me").set(student.auth)).status).toBe(401);
  });

  it("role changes apply on the next request because roles are read from the database", async () => {
    const admin = await makeUser("admin");
    const other = await makeUser("faculty");
    await api().patch(`/api/users/${other.user.id}`).set(admin.auth).send({ role: "student", usn: "X1" }).expect(200);
    // The old token (minted as faculty) is revoked by the token-version bump.
    expect((await api().get("/api/dashboard").set(other.auth)).status).toBe(401);
  });

  it("protects against admins locking themselves out", async () => {
    const admin = await makeUser("admin");
    expect((await api().post(`/api/users/${admin.user.id}/deactivate`).set(admin.auth)).status).toBe(400);
    expect((await api().patch(`/api/users/${admin.user.id}`).set(admin.auth).send({ role: "faculty" })).status).toBe(400);
  });

  it("team progress board: admins see every team, faculty only their own, students are refused", async () => {
    const a = await scenario("in_progress");
    const b = await scenario("in_progress");

    const adminView = await api().get("/api/teams/progress").set(a.admin.auth);
    expect(adminView.status).toBe(200);
    expect(adminView.body.data.length).toBe(2);

    const facultyView = await api().get("/api/teams/progress").set(a.faculty.auth);
    expect(facultyView.status).toBe(200);
    expect(facultyView.body.data.map((r: any) => r.team.id)).toEqual([a.team.id]);

    expect((await api().get("/api/teams/progress").set(b.s1.auth)).status).toBe(403);
  });

  it("audit log is admin-only", async () => {
    const faculty = await makeUser("faculty");
    const admin = await makeUser("admin");
    expect((await api().get("/api/admin/audit-logs").set(faculty.auth)).status).toBe(403);
    expect((await api().get("/api/admin/audit-logs").set(admin.auth)).status).toBe(200);
  });

  it("rejects malformed ids with 400 instead of leaking cast errors", async () => {
    const admin = await makeUser("admin");
    const res = await api().get("/api/projects/not-an-id").set(admin.auth);
    expect(res.status).toBe(400);
  });
});
