import { api, addTask, scenario } from "./helpers";
import { Project } from "../src/models/Project";

describe("task assignment", () => {
  it("cannot add tasks before the proposal is approved", async () => {
    const { project, s1 } = await scenario("pending_review");
    const res = await api().post(`/api/projects/${project.id}/tasks`).set(s1.auth).send({ title: "Too early" });
    expect(res.status).toBe(403);
  });

  it("assigns only to members of the project's own team", async () => {
    const { project, s1, s2, outsider } = await scenario("approved");
    const bad = await api().post(`/api/projects/${project.id}/tasks`).set(s1.auth).send({ title: "Build API", assignee: outsider.user.id });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toMatch(/members of this project's team/);

    const ok = await api().post(`/api/projects/${project.id}/tasks`).set(s1.auth).send({ title: "Build API", assignee: s2.user.id, priority: "high", dueDate: "2030-01-15" });
    expect(ok.status).toBe(201);
    expect(ok.body.data.assignee.id).toBe(s2.user.id);
    // First task moves the project from approved to in progress.
    expect((await Project.findById(project._id))!.status).toBe("in_progress");
  });

  it("outsiders and faculty cannot create tasks", async () => {
    const { project, outsider, faculty } = await scenario("in_progress");
    expect((await api().post(`/api/projects/${project.id}/tasks`).set(outsider.auth).send({ title: "Hack" })).status).toBe(403);
    expect((await api().post(`/api/projects/${project.id}/tasks`).set(faculty.auth).send({ title: "Hack" })).status).toBe(403);
  });

  it("progress follows task status and overdue tasks are flagged", async () => {
    const { project, s1, faculty } = await scenario("in_progress");
    const t1 = await addTask(project._id, s1.user._id, { title: "Done soon" });
    await addTask(project._id, s1.user._id, { title: "Late", dueDate: new Date(Date.now() - 86400000) });

    await api().patch(`/api/projects/${project.id}/tasks/${t1.id}`).set(s1.auth).send({ status: "done" }).expect(200);
    const detail = await api().get(`/api/projects/${project.id}`).set(faculty.auth);
    expect(detail.body.data.progress).toBe(50);
    expect(detail.body.data.taskStats).toMatchObject({ total: 2, done: 1, overdue: 1 });

    const tasks = await api().get(`/api/projects/${project.id}/tasks?overdue=true`).set(faculty.auth);
    expect(tasks.body.data).toHaveLength(1);
    expect(tasks.body.data[0]).toMatchObject({ title: "Late", isOverdue: true });
  });

  it("locks tasks once the project is submitted", async () => {
    const { project, s1 } = await scenario("submitted");
    const t = await addTask(project._id, s1.user._id);
    expect((await api().patch(`/api/projects/${project.id}/tasks/${t.id}`).set(s1.auth).send({ status: "done" })).status).toBe(403);
  });

  it("reports per-member progress", async () => {
    const { project, s1, s2 } = await scenario("in_progress");
    await addTask(project._id, s1.user._id, { assignee: s1.user._id, status: "done" });
    await addTask(project._id, s1.user._id, { assignee: s1.user._id });
    await addTask(project._id, s1.user._id, { assignee: s2.user._id, status: "done" });
    const res = await api().get(`/api/projects/${project.id}/member-progress`).set(s2.auth);
    const byId = Object.fromEntries(res.body.data.map((m: any) => [m.user.id, m]));
    expect(byId[s1.user.id]).toMatchObject({ assigned: 2, done: 1, progress: 50 });
    expect(byId[s2.user.id]).toMatchObject({ assigned: 1, done: 1, progress: 100 });
  });
});
