import { api, addTask, scenario } from "./helpers";

describe("dashboards", () => {
  it("returns a role-specific summary with progress for each role", async () => {
    const { project, s1, faculty, admin } = await scenario("in_progress");
    await addTask(project._id, s1.user._id, { assignee: s1.user._id, status: "done" });
    await addTask(project._id, s1.user._id, { assignee: s1.user._id, dueDate: new Date(Date.now() + 86400000) });

    const student = await api().get("/api/dashboard").set(s1.auth);
    expect(student.status).toBe(200);
    expect(student.body.data).toMatchObject({ role: "student", project: { progress: 50 }, counts: { myOpenTasks: 1 } });
    expect(student.body.data.deadlines).toHaveLength(1);

    const fac = await api().get("/api/dashboard").set(faculty.auth);
    expect(fac.body.data.role).toBe("faculty");
    expect(fac.body.data.teams[0]).toMatchObject({ progress: 50, project: { id: project.id } });

    const adm = await api().get("/api/dashboard").set(admin.auth);
    expect(adm.body.data.role).toBe("admin");
    expect(adm.body.data.counts).toMatchObject({ students: 3, faculty: 2, teams: 1, projects: 1 });
  });

  it("health and public config endpoints work without auth", async () => {
    expect((await api().get("/api/health")).status).toBe(200);
    const meta = await api().get("/api/meta");
    expect(meta.body.data).toMatchObject({ appName: "EduTrack", storageDriver: "local", maxFileSizeMb: 25 });
  });
});
