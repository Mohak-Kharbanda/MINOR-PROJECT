import React, { createContext, useContext, useEffect, useState } from "react";
import { loadData, saveData, uid } from "../lib/seed.js";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  // ---------- Lookups ----------
  const getUser = (id) => data.users.find((u) => u.id === id);
  const getDepartment = (id) => data.departments.find((d) => d.id === id);
  const students = data.users.filter((u) => u.role === "student");
  const faculty = data.users.filter((u) => u.role === "faculty");

  // ---------- Projects ----------
  function createProject({ title, description, department, facultyId, teamMembers, createdBy }) {
    const project = {
      id: uid("p"),
      title,
      description,
      department,
      facultyId,
      createdBy,
      teamMembers: Array.from(new Set([createdBy, ...teamMembers])),
      status: "pending",
      feedback: "",
      marks: null,
      createdAt: Date.now(),
      tasks: [],
      files: [],
    };
    setData((d) => ({ ...d, projects: [project, ...d.projects] }));
    return project;
  }

  function updateProject(projectId, patch) {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)),
    }));
  }

  function setProjectStatus(projectId, status, feedback) {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId
          ? { ...p, status, feedback: feedback !== undefined ? feedback : p.feedback }
          : p
      ),
    }));
  }

  function assignMarks(projectId, marks) {
    updateProject(projectId, { marks });
  }

  // ---------- Tasks ----------
  function addTask(projectId, { title, assigneeId, deadline }) {
    const task = { id: uid("t"), title, assigneeId, deadline, status: "todo" };
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p
      ),
    }));
  }

  function updateTaskStatus(projectId, taskId, status) {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) }
          : p
      ),
    }));
  }

  function deleteTask(projectId, taskId) {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p
      ),
    }));
  }

  // ---------- Files ----------
  // A real deployment streams the file to Cloudinary/AWS S3 and stores
  // the returned URL; this demo records the filename + size only.
  function addFile(projectId, { name, uploadedById }) {
    const file = { id: uid("f"), name, uploadedById, date: new Date().toISOString().slice(0, 10) };
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId ? { ...p, files: [...p.files, file] } : p
      ),
    }));
  }

  function deleteFile(projectId, fileId) {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === projectId ? { ...p, files: p.files.filter((f) => f.id !== fileId) } : p
      ),
    }));
  }

  // ---------- Users (Admin) ----------
  function addUser(user) {
    setData((d) => ({ ...d, users: [...d.users, { id: uid("u"), ...user }] }));
  }

  function deleteUser(userId) {
    setData((d) => ({ ...d, users: d.users.filter((u) => u.id !== userId) }));
  }

  // ---------- Departments (Admin) ----------
  function addDepartment(name) {
    setData((d) => ({ ...d, departments: [...d.departments, { id: uid("dept"), name }] }));
  }

  function deleteDepartment(deptId) {
    setData((d) => ({ ...d, departments: d.departments.filter((x) => x.id !== deptId) }));
  }

  const value = {
    data,
    getUser,
    getDepartment,
    students,
    faculty,
    createProject,
    updateProject,
    setProjectStatus,
    assignMarks,
    addTask,
    updateTaskStatus,
    deleteTask,
    addFile,
    deleteFile,
    addUser,
    deleteUser,
    addDepartment,
    deleteDepartment,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
