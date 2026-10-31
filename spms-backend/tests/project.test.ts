import { api, makeDepartment, makeTeam, makeUser, scenario } from "./helpers";
import { Project } from "../src/models/Project";
import { ProjectFile } from "../src/models/ProjectFile";

async function proposalSetup() {
  const dept = await makeDepartment();
  const faculty = await makeUser("faculty", { department: dept._id });
  const s1 = await makeUser("student", { department: dept._id });
  const team = await makeTeam([s1.user], dept._id);
  const body = {
    title: "Smart Irrigation",
    description: "Soil moisture sensors drive irrigation schedules automatically.",
    department: dept.id,
    academicTerm: "2026 Odd",
    faculty: faculty.user.id,
    techStack: ["ESP32"],
  };
  return { dept, faculty, s1, team, body };
}

describe("project proposals", () => {
  it("requires the student to be on a team, and the team comes from the session — not the request", async () => {
    const { body } = await proposalSetup();
    const loner = await makeUser("student");
    const res = await api().post("/api/projects").set(loner.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/team/i);
  });

  it("creates a proposal pending review and allows only one project per team", async () => {
    const { s1, body, team } = await proposalSetup();
    const res = await api().post("/api/projects").set(s1.auth).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "pending_review", title: "Smart Irrigation" });
    expect(res.body.data.team.id).toBe(team.id);
    expect(res.body.data.permissions.canEditProposal).toBe(true);

    const again = await api().post("/api/projects").set(s1.auth).send(body);
    expect(again.status).toBe(409);
  });

  it("hides drafts from faculty until they are sent for review", async () => {
    const { s1, faculty, body } = await proposalSetup();
    const draft = await api().post("/api/projects").set(s1.auth).send({ ...body, submitForReview: false });
    expect(draft.body.data.status).toBe("draft");
    expect((await api().get(`/api/projects/${draft.body.data.id}`).set(faculty.auth)).status).toBe(403);

    await api().post(`/api/projects/${draft.body.data.id}/submit-proposal`).set(s1.auth).expect(200);
    expect((await api().get(`/api/projects/${draft.body.data.id}`).set(faculty.auth)).status).toBe(200);
  });
});

describe("proposal review", () => {
  it("only the assigned faculty guide can approve; unassigned faculty can't even view", async () => {
    const { project, faculty, otherFaculty } = await scenario("pending_review");

    expect((await api().get(`/api/projects/${project.id}`).set(otherFaculty.auth)).status).toBe(403);
    const intruder = await api().post(`/api/projects/${project.id}/review`).set(otherFaculty.auth).send({ decision: "approved" });
    expect(intruder.status).toBe(403);

    const res = await api().post(`/api/projects/${project.id}/review`).set(faculty.auth).send({ decision: "approved", message: "Looks great" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("approved");
    expect(res.body.data.reviews[0]).toMatchObject({ decision: "approved", message: "Looks great" });
  });

  it("students cannot review their own proposal", async () => {
    const { project, s1 } = await scenario("pending_review");
    expect((await api().post(`/api/projects/${project.id}/review`).set(s1.auth).send({ decision: "approved" })).status).toBe(403);
  });

  it("rejection needs feedback; the team revises and resubmits", async () => {
    const { project, faculty, s1 } = await scenario("pending_review");
    const noReason = await api().post(`/api/projects/${project.id}/review`).set(faculty.auth).send({ decision: "rejected" });
    expect(noReason.status).toBe(400);

    await api().post(`/api/projects/${project.id}/review`).set(faculty.auth).send({ decision: "rejected", message: "Scope is too broad." }).expect(200);
    const edit = await api().patch(`/api/projects/${project.id}`).set(s1.auth).send({ title: "Narrower scope" });
    expect(edit.status).toBe(200);
    const resubmit = await api().post(`/api/projects/${project.id}/submit-proposal`).set(s1.auth);
    expect(resubmit.body.data.status).toBe("pending_review");
  });

  it("an approved proposal can no longer be edited by students", async () => {
    const { project, s1 } = await scenario("approved");
    expect((await api().patch(`/api/projects/${project.id}`).set(s1.auth).send({ title: "Sneaky change" })).status).toBe(403);
  });
});

describe("submission and evaluation", () => {
  it("final submission needs a final deliverable file", async () => {
    const { project, s1 } = await scenario("in_progress");
    const res = await api().post(`/api/projects/${project.id}/submit`).set(s1.auth).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/final submission file/);
  });

  it("evaluation is blocked until submission, then records marks, evaluator and date", async () => {
    const { project, faculty, otherFaculty, s1 } = await scenario("in_progress");
    expect((await api().post(`/api/projects/${project.id}/evaluate`).set(faculty.auth).send({ marks: 80 })).status).toBe(403);

    await api().post(`/api/projects/${project.id}/files`).set(s1.auth).field("kind", "final_submission").attach("file", Buffer.from("report"), "report.txt").expect(201);
    await api().post(`/api/projects/${project.id}/submit`).set(s1.auth).send({ note: "Done!" }).expect(200);

    expect((await api().post(`/api/projects/${project.id}/evaluate`).set(otherFaculty.auth).send({ marks: 80 })).status).toBe(403);
    expect((await api().post(`/api/projects/${project.id}/evaluate`).set(faculty.auth).send({ marks: 120 })).status).toBe(400);

    const res = await api().post(`/api/projects/${project.id}/evaluate`).set(faculty.auth).send({ marks: 86, notes: "Solid work" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("evaluated");
    expect(res.body.data.evaluation).toMatchObject({ marks: 86, notes: "Solid work", evaluatedBy: { id: faculty.user.id } });
    expect(res.body.data.evaluation.evaluatedAt).toEqual(expect.any(String));
  });

  it("faculty can return a submission to the team with feedback", async () => {
    const { project, faculty, s1 } = await scenario("in_progress");
    await api().post(`/api/projects/${project.id}/files`).set(s1.auth).field("kind", "final_submission").attach("file", Buffer.from("x"), "final.txt").expect(201);
    await api().post(`/api/projects/${project.id}/submit`).set(s1.auth).send({}).expect(200);
    const res = await api().post(`/api/projects/${project.id}/return`).set(faculty.auth).send({ message: "Please add the test results." });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("in_progress");
    expect(await ProjectFile.countDocuments({ project: project._id })).toBe(1);
  });
});

describe("visibility and admin actions", () => {
  it("scopes project lists to the viewer", async () => {
    const a = await scenario("in_progress");
    const b = await scenario("in_progress");
    const studentList = await api().get("/api/projects").set(a.s1.auth);
    expect(studentList.body.data.map((p: any) => p.id)).toEqual([a.project.id]);
    const facultyList = await api().get("/api/projects").set(b.faculty.auth);
    expect(facultyList.body.data.map((p: any) => p.id)).toEqual([b.project.id]);
    const adminList = await api().get("/api/projects?limit=1").set(a.admin.auth);
    expect(adminList.body.pagination).toMatchObject({ total: 2, pages: 2 });
    expect((await api().get(`/api/projects/${b.project.id}`).set(a.s1.auth)).status).toBe(403);
  });

  it("admins reassign the faculty guide, which moves access with it", async () => {
    const { project, faculty, otherFaculty, admin } = await scenario("in_progress");
    const res = await api().patch(`/api/projects/${project.id}/faculty`).set(admin.auth).send({ faculty: otherFaculty.user.id });
    expect(res.status).toBe(200);
    expect((await api().get(`/api/projects/${project.id}`).set(faculty.auth)).status).toBe(403);
    expect((await api().get(`/api/projects/${project.id}`).set(otherFaculty.auth)).status).toBe(200);
  });

  it("only admins can delete a project", async () => {
    const { project, faculty, admin } = await scenario("in_progress");
    expect((await api().delete(`/api/projects/${project.id}`).set(faculty.auth)).status).toBe(403);
    expect((await api().delete(`/api/projects/${project.id}`).set(admin.auth)).status).toBe(200);
    expect(await Project.countDocuments()).toBe(0);
  });
});
