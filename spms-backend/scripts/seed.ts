/**
 * Loads realistic demo data: departments, an admin, faculty, students, teams
 * and projects at every stage of the lifecycle, with tasks, files (including
 * faculty re-uploads with comments), feedback and activity.
 *
 *   npm run seed            # on an empty database
 *   npm run seed -- --reset # wipe EduTrack collections first (asks no questions!)
 *
 * Every seeded account uses the password printed at the end. Refuses to run
 * in production unless SEED_ALLOW_PRODUCTION=true.
 */
import mongoose, { Types } from "mongoose";
import { connectDB } from "../src/config/db";
import { env } from "../src/config/env";
import { User } from "../src/models/User";
import { Department } from "../src/models/Department";
import { Team } from "../src/models/Team";
import { Project } from "../src/models/Project";
import { Task } from "../src/models/Task";
import { ProjectFile } from "../src/models/ProjectFile";
import { AuditLog } from "../src/models/AuditLog";
import { recomputeProjectProgress } from "../src/services/progress";
import { getStorage } from "../src/services/storage";

const DEMO_PASSWORD = "Password123";
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

async function createUser(data: { name: string; email: string; role: "student" | "faculty" | "admin"; usn?: string; department?: Types.ObjectId }) {
  const user = new User({ ...data, lastLoginAt: daysFromNow(-Math.random() * 5) });
  await user.setPassword(DEMO_PASSWORD);
  return user.save();
}

async function log(actor: any, action: string, summary: string, project: any, at: Date, targetType = "Project") {
  await AuditLog.create({ actor: actor._id, actorRole: actor.role, action, summary, targetType, targetId: project?._id ?? null, project: project?._id ?? null, createdAt: at });
}

async function main() {
  if (env.isProduction && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error("Refusing to seed a production database. Set SEED_ALLOW_PRODUCTION=true if you really mean it.");
  }
  await connectDB();

  const reset = process.argv.includes("--reset");
  if ((await User.estimatedDocumentCount()) > 0) {
    if (!reset) {
      console.log("[seed] The database already has users. Re-run with --reset to wipe EduTrack data and reseed.");
      return;
    }
    console.log("[seed] --reset: clearing EduTrack collections…");
    await Promise.all([User, Department, Team, Project, Task, ProjectFile, AuditLog].map((m: any) => m.deleteMany({})));
  }
  await Promise.all([User, Department, Team, Project, Task, ProjectFile, AuditLog].map((m: any) => m.syncIndexes()));

  // ---------- Departments ----------
  const [cse, ece, ise, me] = await Department.create([
    { name: "Computer Science & Engineering", code: "CSE", description: "Software, systems and AI." },
    { name: "Electronics & Communication", code: "ECE", description: "Embedded systems, VLSI and communication." },
    { name: "Information Science", code: "ISE", description: "Data, information systems and the web." },
    { name: "Mechanical Engineering", code: "ME", description: "Design, manufacturing and thermal systems." },
  ]);

  // ---------- People ----------
  const admin = await createUser({ name: "Aditi Rao", email: "admin@edutrack.test", role: "admin" });
  const fac = {
    meera: await createUser({ name: "Dr. Meera Iyer", email: "meera.iyer@edutrack.test", role: "faculty", department: cse._id }),
    arjun: await createUser({ name: "Prof. Arjun Nair", email: "arjun.nair@edutrack.test", role: "faculty", department: cse._id }),
    kavita: await createUser({ name: "Dr. Kavita Menon", email: "kavita.menon@edutrack.test", role: "faculty", department: ece._id }),
    rahul: await createUser({ name: "Prof. Rahul Deshpande", email: "rahul.deshpande@edutrack.test", role: "faculty", department: ise._id }),
  };

  const studentRows: Array<[string, string, Types.ObjectId]> = [
    ["Aarav Sharma", "1CS21CS001", cse._id], ["Diya Patel", "1CS21CS014", cse._id], ["Kabir Singh", "1CS21CS027", cse._id], ["Ananya Gupta", "1CS21CS033", cse._id],
    ["Vihaan Reddy", "1CS21CS041", cse._id], ["Isha Kulkarni", "1CS21CS052", cse._id], ["Rohan Joshi", "1CS21CS060", cse._id],
    ["Saanvi Bhat", "1CS21EC008", ece._id], ["Arnav Hegde", "1CS21EC019", ece._id], ["Meghana Rao", "1CS21EC023", ece._id],
    ["Tanvi Shetty", "1CS21IS004", ise._id], ["Yash Agarwal", "1CS21IS011", ise._id], ["Nisha Pillai", "1CS21IS017", ise._id],
    ["Karthik Murthy", "1CS21CS071", cse._id], ["Riya Das", "1CS21CS080", cse._id],
    ["Siddharth Jain", "1CS21ME005", me._id],
  ];
  const s: any[] = [];
  for (const [name, usn, dept] of studentRows) {
    const first = name.split(" ")[0].toLowerCase();
    s.push(await createUser({ name, usn, department: dept, role: "student", email: `${first}@edutrack.test` }));
  }

  // ---------- Teams + projects ----------
  const storage = getStorage();

  async function team(name: string, code: string, dept: any, members: any[]) {
    return Team.create({ name, joinCode: code, department: dept._id, members: members.map((m) => m._id), leader: members[0]._id, maxMembers: env.teamMaxMembers });
  }

  async function addFile(project: any, opts: { name: string; body: string; by: any; kind?: "project_file" | "final_submission"; note?: string; lineageKey?: string; version?: number; reviewStatus?: "pending" | "needs_revision" | "accepted"; reviewer?: any; comments?: Array<[any, string]>; at: Date }) {
    const stored = await storage.put({ buffer: Buffer.from(opts.body), prefix: `projects/${project.id}`, filename: opts.name, mimeType: opts.name.endsWith(".md") ? "text/markdown" : "text/plain" });
    const version = opts.version ?? 1;
    if (version > 1) await ProjectFile.updateMany({ project: project._id, lineageKey: opts.lineageKey }, { $set: { isLatest: false } });
    return ProjectFile.create({
      project: project._id,
      lineageKey: opts.lineageKey ?? new Types.UUID().toString(),
      version,
      isLatest: true,
      originalName: opts.name,
      mimeType: opts.name.endsWith(".md") ? "text/markdown" : "text/plain",
      size: Buffer.byteLength(opts.body),
      kind: opts.kind ?? "project_file",
      note: opts.note ?? "",
      storage: stored,
      uploadedBy: opts.by._id,
      uploaderRole: opts.by.role,
      reviewStatus: opts.reviewStatus ?? "pending",
      reviewedBy: opts.reviewer?._id ?? null,
      reviewedAt: opts.reviewer ? opts.at : null,
      comments: (opts.comments ?? []).map(([author, message], i) => ({ author: author._id, authorRole: author.role, message, createdAt: new Date(opts.at.getTime() + (i + 1) * 3600_000) })),
      createdAt: opts.at,
    });
  }

  async function tasks(project: any, members: any[], rows: Array<[string, "todo" | "in_progress" | "review" | "done", number, "low" | "medium" | "high", number]>) {
    for (const [title, status, assigneeIdx, priority, dueInDays] of rows) {
      await Task.create({
        project: project._id,
        title,
        description: "",
        assignee: members[assigneeIdx]?._id ?? null,
        status,
        priority,
        dueDate: daysFromNow(dueInDays),
        completedAt: status === "done" ? daysFromNow(Math.min(dueInDays, 0) - 1) : null,
        createdBy: members[0]._id,
      });
    }
    await recomputeProjectProgress(project._id);
  }

  // 1) In progress, healthy (≈60%)
  const t1m = [s[0], s[1], s[2], s[3]];
  const t1 = await team("Byte Brigade", "BYTE24", cse, t1m);
  const p1 = await Project.create({
    title: "Smart Campus Attendance with Face Recognition",
    description: "A contactless attendance system using on-device face recognition, with a faculty dashboard and anomaly alerts for proxy attendance. Runs on a Raspberry Pi at each classroom entrance and syncs to a central API.",
    objectives: "1. 95%+ recognition accuracy in classroom lighting\n2. Under 2 seconds per student\n3. Privacy-first: embeddings only, no stored photos",
    techStack: ["Python", "OpenCV", "FastAPI", "React", "PostgreSQL"],
    department: cse._id, academicTerm: "2026 Odd Semester", team: t1._id, faculty: fac.meera._id, status: "in_progress",
    deadline: daysFromNow(24), createdBy: s[0]._id, proposalSubmittedAt: daysFromNow(-40),
    reviews: [{ decision: "approved", message: "Strong proposal. Keep the privacy constraints front and centre.", by: fac.meera._id, at: daysFromNow(-37) }],
    feedback: [
      { author: fac.meera._id, authorRole: "faculty", message: "Strong proposal. Keep the privacy constraints front and centre.", kind: "proposal", createdAt: daysFromNow(-37) },
      { author: fac.meera._id, authorRole: "faculty", message: "Good progress on the dataset. Please add a section on how you handle lighting variation in the report.", kind: "progress", createdAt: daysFromNow(-6) },
      { author: s[0]._id, authorRole: "student", message: "Thanks ma'am — we'll add augmentation results in the next draft.", kind: "general", createdAt: daysFromNow(-5) },
    ],
  });
  await tasks(p1, t1m, [
    ["Literature survey on face recognition", "done", 1, "medium", -30], ["Collect and label classroom dataset", "done", 2, "high", -20],
    ["Train embedding model", "done", 0, "high", -12], ["Raspberry Pi capture service", "done", 3, "medium", -8],
    ["Attendance REST API", "done", 0, "high", -5], ["Faculty dashboard UI", "in_progress", 1, "medium", 4],
    ["Proxy-attendance anomaly alerts", "review", 2, "medium", 6], ["Load testing with 60 students", "todo", 3, "low", 12],
    ["Lighting robustness experiments", "in_progress", 2, "high", -2], ["Final report draft", "todo", 0, "high", 18],
  ]);
  const lineage1 = new Types.UUID().toString();
  await addFile(p1, { name: "project-report-draft.md", body: "# Smart Campus Attendance\n\nDraft 1 of the project report.\n", by: s[0], lineageKey: lineage1, at: daysFromNow(-9), reviewStatus: "needs_revision", reviewer: fac.meera, comments: [[fac.meera, "Methodology section is thin — expand on the embedding model choice."]] });
  await addFile(p1, { name: "project-report-draft.md", body: "# Smart Campus Attendance\n\nDraft 1 with faculty edits: restructured methodology.\n", by: fac.meera, lineageKey: lineage1, version: 2, note: "I restructured the methodology section and fixed the citation format — please continue from this version.", at: daysFromNow(-7), comments: [[s[1], "Thank you ma'am, continuing from here."]] });
  await addFile(p1, { name: "system-architecture.txt", body: "Edge device -> API -> DB -> Dashboard\n", by: s[2], at: daysFromNow(-15), reviewStatus: "accepted", reviewer: fac.meera });
  await log(s[0], "project.propose", `Proposed "${p1.title}" to ${fac.meera.name} for review`, p1, daysFromNow(-40));
  await log(fac.meera, "project.approved", `Approved the proposal "${p1.title}"`, p1, daysFromNow(-37));
  await log(fac.meera, "file.reupload", "Uploaded v2 of project-report-draft.md (faculty revision)", p1, daysFromNow(-7), "ProjectFile");
  await log(s[1], "task.complete", 'Completed task "Attendance REST API"', p1, daysFromNow(-5), "Task");
  await log(s[2], "task.status", 'Moved "Proxy-attendance anomaly alerts" to In review', p1, daysFromNow(-1), "Task");

  // 2) In progress, at risk (≈25%, overdue tasks)
  const t2m = [s[4], s[5], s[6]];
  const t2 = await team("Neural Ninjas", "NINJA7", cse, t2m);
  const p2 = await Project.create({
    title: "Crop Disease Detection from Leaf Images",
    description: "A mobile-first web app that lets farmers photograph a leaf and get a likely disease diagnosis and treatment advice in Kannada, Hindi or English, using a fine-tuned convolutional network.",
    objectives: "Support 10 common crop diseases; work offline after first load; multilingual advice.",
    techStack: ["PyTorch", "TensorFlow.js", "React", "Node.js"],
    department: cse._id, academicTerm: "2026 Odd Semester", team: t2._id, faculty: fac.arjun._id, status: "in_progress",
    deadline: daysFromNow(8), createdBy: s[4]._id, proposalSubmittedAt: daysFromNow(-35),
    reviews: [{ decision: "approved", message: "Approved. Scope the languages carefully.", by: fac.arjun._id, at: daysFromNow(-33) }],
    feedback: [{ author: fac.arjun._id, authorRole: "faculty", message: "You are behind schedule on the model. Let's meet on Monday.", kind: "progress", createdAt: daysFromNow(-3) }],
  });
  await tasks(p2, t2m, [
    ["Dataset sourcing (PlantVillage)", "done", 0, "high", -25], ["Baseline CNN", "done", 1, "high", -15],
    ["Fine-tune MobileNet", "in_progress", 1, "high", -4], ["Translation strings", "todo", 2, "medium", -1],
    ["Offline PWA shell", "todo", 2, "medium", 3], ["Field testing with farmers", "todo", 0, "high", 6],
    ["Accuracy report", "todo", 0, "medium", 7], ["UI polish", "todo", 1, "low", 7],
  ]);
  await addFile(p2, { name: "dataset-notes.txt", body: "PlantVillage subset: 10 classes, 18k images.\n", by: s[4], at: daysFromNow(-20) });
  await log(fac.arjun, "project.feedback", "Left feedback on the project", p2, daysFromNow(-3));

  // 3) Submitted, awaiting evaluation
  const t3m = [s[7], s[8], s[9]];
  const t3 = await team("Circuit Breakers", "CIRC88", ece, t3m);
  const p3 = await Project.create({
    title: "IoT Air Quality Monitoring Network",
    description: "Low-cost air quality sensor nodes across campus reporting PM2.5, CO2 and humidity over LoRa to a gateway, with a public live map and threshold alerts.",
    objectives: "10 nodes, 3 km coverage, 6 months battery life.",
    techStack: ["ESP32", "LoRa", "MQTT", "Grafana"],
    department: ece._id, academicTerm: "2026 Odd Semester", team: t3._id, faculty: fac.kavita._id, status: "submitted",
    deadline: daysFromNow(-1), createdBy: s[7]._id, proposalSubmittedAt: daysFromNow(-60),
    submission: { submittedAt: daysFromNow(-2), submittedBy: s[7]._id, note: "Final report, firmware and demo video link included." },
    reviews: [{ decision: "approved", message: "Approved.", by: fac.kavita._id, at: daysFromNow(-58) }],
    feedback: [{ author: fac.kavita._id, authorRole: "faculty", message: "Approved.", kind: "proposal", createdAt: daysFromNow(-58) }],
  });
  await tasks(p3, t3m, [
    ["Sensor calibration", "done", 0, "high", -45], ["LoRa gateway", "done", 1, "high", -35], ["Node enclosure", "done", 2, "medium", -25],
    ["Grafana dashboards", "done", 0, "medium", -15], ["Battery testing", "done", 1, "high", -8], ["Final report", "done", 2, "high", -3],
  ]);
  await addFile(p3, { name: "final-report.md", body: "# IoT Air Quality Network — Final Report\n", by: s[7], kind: "final_submission", at: daysFromNow(-2) });
  await addFile(p3, { name: "firmware-source.txt", body: "// ESP32 firmware listing\n", by: s[8], kind: "final_submission", at: daysFromNow(-2) });
  await log(s[7], "project.submit", "Submitted the final project with 2 deliverables", p3, daysFromNow(-2));

  // 4) Pending review
  const t4m = [s[10], s[11]];
  const t4 = await team("Data Dynamos", "DATA42", ise, t4m);
  const p4 = await Project.create({
    title: "Placement Analytics Dashboard",
    description: "An analytics dashboard for the placement cell that tracks drives, eligibility, offers and trends across batches, with role-based access for students, coordinators and recruiters.",
    techStack: ["Next.js", "MongoDB", "Chart.js"],
    department: ise._id, academicTerm: "2026 Odd Semester", team: t4._id, faculty: fac.rahul._id, status: "pending_review",
    deadline: daysFromNow(60), createdBy: s[10]._id, proposalSubmittedAt: daysFromNow(-1),
  });
  await log(s[10], "project.propose", `Proposed "${p4.title}" to ${fac.rahul.name} for review`, p4, daysFromNow(-1));

  // 5) Evaluated
  const t5m = [s[13], s[14]];
  const t5 = await team("Code Crafters", "CRAFT5", cse, t5m);
  const p5 = await Project.create({
    title: "Library Seat Booking System",
    description: "Real-time seat booking for the central library with QR check-in, auto-release of no-shows and usage heatmaps for the librarian.",
    techStack: ["Flutter", "Firebase"],
    department: cse._id, academicTerm: "2026 Odd Semester", team: t5._id, faculty: fac.meera._id, status: "evaluated",
    deadline: daysFromNow(-10), createdBy: s[13]._id, proposalSubmittedAt: daysFromNow(-80),
    submission: { submittedAt: daysFromNow(-12), submittedBy: s[13]._id, note: "" },
    evaluation: { marks: 88, maxMarks: 100, notes: "Polished, well-tested product. The heatmap analysis was a highlight.", evaluatedBy: fac.meera._id, evaluatedAt: daysFromNow(-4) },
    reviews: [{ decision: "approved", message: "", by: fac.meera._id, at: daysFromNow(-78) }],
  });
  await tasks(p5, t5m, [["Booking flow", "done", 0, "high", -50], ["QR check-in", "done", 1, "high", -40], ["Heatmaps", "done", 0, "medium", -25], ["Report", "done", 1, "high", -14]]);
  await addFile(p5, { name: "final-report.md", body: "# Library Seat Booking — Final Report\n", by: s[13], kind: "final_submission", at: daysFromNow(-12), reviewStatus: "accepted", reviewer: fac.meera });
  await log(fac.meera, "project.evaluate", "Evaluated the project: 88/100", p5, daysFromNow(-4));

  // 6) Rejected (needs revision)
  const t6m = [s[12]];
  const t6 = await team("Solo Sprint", "SOLO12", ise, t6m);
  const p6 = await Project.create({
    title: "Blockchain Voting App",
    description: "A blockchain-based voting application for student council elections with verifiable ballots.",
    techStack: ["Solidity", "React"],
    department: ise._id, academicTerm: "2026 Odd Semester", team: t6._id, faculty: fac.rahul._id, status: "rejected",
    createdBy: s[12]._id, proposalSubmittedAt: daysFromNow(-10),
    reviews: [{ decision: "rejected", message: "Scope is unclear and the threat model is missing. Please revise with a concrete plan for voter anonymity.", by: fac.rahul._id, at: daysFromNow(-8) }],
    feedback: [{ author: fac.rahul._id, authorRole: "faculty", message: "Scope is unclear and the threat model is missing. Please revise with a concrete plan for voter anonymity.", kind: "proposal", createdAt: daysFromNow(-8) }],
  });
  await log(fac.rahul, "project.rejected", `Rejected the proposal "${p6.title}"`, p6, daysFromNow(-8));

  // A team that has not proposed yet.
  await team("Fresh Start", "FRESH9", me, [s[15]]);
  await log(admin, "admin.create_department", "Created department Mechanical Engineering (ME)", null, daysFromNow(-90), "Department");

  console.log("\n[seed] Done. Demo accounts (password for all: %s)\n", DEMO_PASSWORD);
  console.table([
    { role: "admin", email: admin.email },
    { role: "faculty", email: fac.meera.email },
    { role: "faculty", email: fac.rahul.email },
    { role: "student (in progress)", email: s[0].email },
    { role: "student (at risk)", email: s[4].email },
    { role: "student (pending review)", email: s[10].email },
    { role: "student (rejected)", email: s[12].email },
    { role: "student (no project)", email: s[15].email },
  ]);
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
