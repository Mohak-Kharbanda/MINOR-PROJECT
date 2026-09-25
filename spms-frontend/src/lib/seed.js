// Seed / demo data for the Student Project Management System.
// In production these collections would live in MongoDB and be served
// by the Node.js + Express REST API described in the project synopsis.
// Here they are persisted to localStorage so the UI is fully usable
// without a backend while the API is being built.

export const STORAGE_KEY = "spms_data_v1";
export const AUTH_KEY = "spms_current_user_v1";

export const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function seedData() {
  const departments = [
    { id: "dept_cse", name: "Computer Science & Engineering" },
    { id: "dept_ece", name: "Electronics & Communication" },
    { id: "dept_ise", name: "Information Science & Engineering" },
  ];

  const users = [
    {
      id: "u_admin",
      name: "System Admin",
      email: "admin@nie.ac.in",
      password: "admin123",
      role: "admin",
      department: "dept_cse",
    },
    {
      id: "u_fac1",
      name: "Mrs. Poornima N",
      email: "poornima@nie.ac.in",
      password: "faculty123",
      role: "faculty",
      department: "dept_cse",
    },
    {
      id: "u_fac2",
      name: "Mrs. Veena Mohan M",
      email: "veena@nie.ac.in",
      password: "faculty123",
      role: "faculty",
      department: "dept_cse",
    },
    {
      id: "u_s1",
      usn: "4NI24CS097",
      name: "Khushal",
      email: "khushal@nie.ac.in",
      password: "student123",
      role: "student",
      department: "dept_cse",
    },
    {
      id: "u_s2",
      usn: "4NI24CS115",
      name: "Mayank Dangi",
      email: "mayank@nie.ac.in",
      password: "student123",
      role: "student",
      department: "dept_cse",
    },
    {
      id: "u_s3",
      usn: "4NI24CS121",
      name: "Mohak Kharbanda",
      email: "mohak@nie.ac.in",
      password: "student123",
      role: "student",
      department: "dept_cse",
    },
    {
      id: "u_s4",
      usn: "4NI25CS412",
      name: "Naresh",
      email: "naresh@nie.ac.in",
      password: "student123",
      role: "student",
      department: "dept_cse",
    },
  ];

  const projects = [
    {
      id: "p_demo",
      title: "Student Project Management System",
      description:
        "A centralized web platform to manage the complete academic project lifecycle — team formation, task tracking, file submission and faculty evaluation.",
      department: "dept_cse",
      createdBy: "u_s1",
      teamMembers: ["u_s1", "u_s2", "u_s3", "u_s4"],
      facultyId: "u_fac1",
      status: "approved", // pending | approved | rejected | completed
      feedback: "Good progress on the auth module. Keep the task board updated weekly.",
      marks: null,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
      tasks: [
        {
          id: "t1",
          title: "Design database schema",
          assigneeId: "u_s1",
          deadline: "2026-09-25",
          status: "done",
        },
        {
          id: "t2",
          title: "Build authentication API (JWT + bcrypt)",
          assigneeId: "u_s4",
          deadline: "2026-09-28",
          status: "in-progress",
        },
        {
          id: "t3",
          title: "Team & task management UI",
          assigneeId: "u_s2",
          deadline: "2026-10-02",
          status: "in-progress",
        },
        {
          id: "t4",
          title: "File submission module",
          assigneeId: "u_s3",
          deadline: "2026-10-05",
          status: "todo",
        },
      ],
      files: [
        { id: "f1", name: "Project_Synopsis_B13.pdf", uploadedById: "u_s1", date: "2026-08-20" },
      ],
    },
  ];

  return { departments, users, projects };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse stored data, reseeding.", e);
  }
  const fresh = seedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCurrentUser(user) {
  if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  else localStorage.removeItem(AUTH_KEY);
}
