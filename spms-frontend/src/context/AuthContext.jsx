import React, { createContext, useContext, useEffect, useState } from "react";
import { loadCurrentUser, saveCurrentUser, loadData, saveData, uid } from "../lib/seed.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => loadCurrentUser());

  useEffect(() => {
    saveCurrentUser(currentUser);
  }, [currentUser]);

  // In the deployed system this hits POST /api/auth/login on the
  // Express backend, which verifies the bcrypt hash and returns a
  // signed JWT. Here we check against the local "users" collection.
  function login(email, password, role) {
    const data = loadData();
    const user = data.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.role === role
    );
    if (!user) return { ok: false, error: "No account found for that email and role." };
    if (user.password !== password) return { ok: false, error: "Incorrect password." };
    const { password: _pw, ...safeUser } = user;
    setCurrentUser(safeUser);
    return { ok: true, user: safeUser };
  }

  // Public registration is only for students — faculty and admin
  // accounts are provisioned by the admin (Role-Based Administration).
  function register({ name, usn, email, password, department }) {
    const data = loadData();
    if (data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const newUser = {
      id: uid("u"),
      name,
      usn,
      email,
      password,
      role: "student",
      department,
    };
    data.users.push(newUser);
    saveData(data);
    const { password: _pw, ...safeUser } = newUser;
    setCurrentUser(safeUser);
    return { ok: true, user: safeUser };
  }

  function logout() {
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
