import { api, makeDepartment, makeTeam, makeUser, scenario, addTask } from "./helpers";
import { Team } from "../src/models/Team";
import { Task } from "../src/models/Task";

describe("teams", () => {
  it("creates a team with a join code that teammates use to join", async () => {
    const dept = await makeDepartment();
    const leader = await makeUser("student");
    const mate = await makeUser("student");
    const created = await api().post("/api/teams").set(leader.auth).send({ name: "Alpha", department: dept.id });
    expect(created.status).toBe(201);
    expect(created.body.data.joinCode).toMatch(/^[A-Z0-9]{6}$/);

    const joined = await api().post("/api/teams/join").set(mate.auth).send({ joinCode: created.body.data.joinCode.toLowerCase() });
    expect(joined.status).toBe(200);
    expect(joined.body.data.members).toHaveLength(2);
  });

  it("prevents duplicate membership in the API and in the database", async () => {
    const dept = await makeDepartment();
    const s1 = await makeUser("student");
    const team = await makeTeam([s1.user], dept._id);
    expect((await api().post("/api/teams").set(s1.auth).send({ name: "Second", department: dept.id })).status).toBe(409);
    expect((await api().post("/api/teams/join").set(s1.auth).send({ joinCode: team.joinCode })).status).toBe(409);
    // The unique multikey index rejects a second team containing the same student.
    await expect(makeTeam([s1.user], dept._id)).rejects.toMatchObject({ code: 11000 });
  });

  it("enforces the team size limit", async () => {
    const dept = await makeDepartment();
    const a = await makeUser("student");
    const b = await makeUser("student");
    const team = await makeTeam([a.user], dept._id, 1);
    const res = await api().post("/api/teams/join").set(b.auth).send({ joinCode: team.joinCode });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/full/);
  });

  it("members add teammates by email, but not students who are already on a team", async () => {
    const { team, s1, outsider } = await scenario("in_progress");
    const res = await api().post(`/api/teams/${team.id}/members`).set(s1.auth).send({ email: outsider.user.email });
    expect(res.status).toBe(200);
    expect(res.body.data.members).toHaveLength(3);
    const again = await api().post(`/api/teams/${team.id}/members`).set(s1.auth).send({ email: outsider.user.email });
    expect(again.status).toBe(409);
  });

  it("only the leader removes members, and the removed member's tasks are unassigned", async () => {
    const { team, project, s1, s2 } = await scenario("in_progress");
    const task = await addTask(project._id, s1.user._id, { assignee: s2.user._id });
    expect((await api().delete(`/api/teams/${team.id}/members/${s1.user.id}`).set(s2.auth)).status).toBe(403);
    expect((await api().delete(`/api/teams/${team.id}/members/${s2.user.id}`).set(s1.auth)).status).toBe(200);
    expect((await Team.findById(team._id))!.members.map(String)).toEqual([s1.user.id]);
    expect((await Task.findById(task._id))!.assignee).toBeNull();
  });

  it("membership is frozen after the final submission", async () => {
    const { team, s1, outsider } = await scenario("submitted");
    expect((await api().post(`/api/teams/${team.id}/members`).set(s1.auth).send({ email: outsider.user.email })).status).toBe(409);
  });
});
