import { api, scenario } from "./helpers.js";
import { MAX_FILE_SIZE_BYTES } from "@edutrack/shared";

function upload(projectId, auth, opts = {}) {
  const req = api().post(`/api/projects/${projectId}/files`).set(auth);
  if (opts.kind) req.field("kind", opts.kind);
  if (opts.lineageKey) req.field("lineageKey", opts.lineageKey);
  if (opts.note) req.field("note", opts.note);
  return req.attach("file", Buffer.isBuffer(opts.body) ? opts.body : Buffer.from(opts.body ?? "hello"), opts.name ?? "notes.txt");
}

describe("project files", () => {
  it("team members upload; outsiders and unassigned faculty can't list, upload or download", async () => {
    const { project, s1, outsider, otherFaculty } = await scenario("in_progress");
    const res = await upload(project.id, s1.auth);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ version: 1, originalName: "notes.txt", uploaderRole: "student", reviewStatus: "pending" });
    expect(res.body.data.storage).toBeUndefined(); // storage keys never leave the server

    expect((await api().get(`/api/projects/${project.id}/files`).set(outsider.auth)).status).toBe(403);
    expect((await api().get(`/api/projects/${project.id}/files`).set(otherFaculty.auth)).status).toBe(403);
    expect((await upload(project.id, outsider.auth)).status).toBe(403);
    expect((await api().get(`/api/projects/${project.id}/files/${res.body.data.id}/url`).set(outsider.auth)).status).toBe(403);
  });

  it("assigned faculty can download, edit and re-upload with a required comment, keeping version history", async () => {
    const { project, s1, faculty } = await scenario("in_progress");
    const first = await upload(project.id, s1.auth, { name: "report.txt", body: "draft one" });
    const lineageKey = first.body.data.lineageKey;

    const noNote = await upload(project.id, faculty.auth, { name: "report.txt", body: "edited", lineageKey });
    expect(noNote.status).toBe(400);
    expect(noNote.body.message).toMatch(/comment/i);

    const revised = await upload(project.id, faculty.auth, {
      name: "report.txt",
      body: "draft one, edited by faculty",
      lineageKey,
      note: "Fixed the introduction",
    });
    expect(revised.status).toBe(201);
    expect(revised.body.data).toMatchObject({ version: 2, uploaderRole: "faculty", note: "Fixed the introduction", isLatest: true });

    const list = await api().get(`/api/projects/${project.id}/files`).set(s1.auth);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ version: 2, versionCount: 2 });

    const history = await api().get(`/api/projects/${project.id}/files/lineage/${lineageKey}`).set(s1.auth);
    expect(history.body.data.map((v) => v.version)).toEqual([1, 2]);

    // The student downloads the faculty's edited version through a signed URL.
    const urlRes = await api().get(`/api/projects/${project.id}/files/${revised.body.data.id}/url`).set(s1.auth);
    expect(urlRes.status).toBe(200);
    const download = await api()
      .get(urlRes.body.data.url)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(download.status).toBe(200);
    expect(download.headers["content-disposition"]).toMatch(/attachment/);
    expect(download.body.toString()).toBe("draft one, edited by faculty");
  });

  it("rejects tampered or bogus download tokens", async () => {
    const { project, s1 } = await scenario("in_progress");
    const file = await upload(project.id, s1.auth);
    const urlRes = await api().get(`/api/projects/${project.id}/files/${file.body.data.id}/url`).set(s1.auth);
    const tampered = urlRes.body.data.url.slice(0, -3) + "abc";
    expect((await api().get(tampered)).status).toBe(403);
    expect((await api().get("/api/storage/local/not-a-token")).status).toBe(403);
  });

  it("enforces file type and size limits", async () => {
    const { project, s1 } = await scenario("in_progress");
    const exe = await upload(project.id, s1.auth, { name: "virus.exe" });
    expect(exe.status).toBe(400);
    expect(exe.body.message).toMatch(/not allowed/);

    const big = await upload(project.id, s1.auth, { name: "huge.txt", body: Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024, 97) });
    expect(big.status).toBe(413);
  });

  it("anyone on the project can comment, but only faculty/admin set review status", async () => {
    const { project, s1, faculty } = await scenario("in_progress");
    const file = await upload(project.id, s1.auth);
    const id = file.body.data.id;

    expect((await api().post(`/api/projects/${project.id}/files/${id}/comments`).set(s1.auth).send({ message: "Uploaded the draft" })).status).toBe(201);
    expect((await api().patch(`/api/projects/${project.id}/files/${id}/review`).set(s1.auth).send({ reviewStatus: "accepted" })).status).toBe(403);

    const review = await api()
      .patch(`/api/projects/${project.id}/files/${id}/review`)
      .set(faculty.auth)
      .send({ reviewStatus: "needs_revision", message: "Add references" });
    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("needs_revision");
    expect(review.body.data.comments.map((c) => c.message)).toEqual(["Uploaded the draft", "Add references"]);
  });

  it("after final submission students are locked out of uploads but faculty can still revise", async () => {
    const { project, s1, faculty } = await scenario("in_progress");
    const final = await upload(project.id, s1.auth, { kind: "final_submission", name: "final.txt" });
    expect(final.status).toBe(201);
    await api().post(`/api/projects/${project.id}/submit`).set(s1.auth).send({}).expect(200);

    expect((await upload(project.id, s1.auth, { name: "late.txt" })).status).toBe(403);
    const revise = await upload(project.id, faculty.auth, {
      name: "final.txt",
      lineageKey: final.body.data.lineageKey,
      note: "Annotated with grading remarks",
    });
    expect(revise.status).toBe(201);
    expect(revise.body.data.kind).toBe("final_submission");
  });

  it("students can only delete files they uploaded", async () => {
    const { project, s1, s2 } = await scenario("in_progress");
    const file = await upload(project.id, s1.auth);
    expect((await api().delete(`/api/projects/${project.id}/files/${file.body.data.id}`).set(s2.auth)).status).toBe(403);
    expect((await api().delete(`/api/projects/${project.id}/files/${file.body.data.id}`).set(s1.auth)).status).toBe(200);
  });
});
