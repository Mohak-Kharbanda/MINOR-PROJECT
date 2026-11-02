import { Building2, ClipboardList, FolderKanban, GraduationCap, LayoutDashboard, ScrollText, UserCog, Users, UsersRound, BarChart3 } from "lucide-react";

export const NAV = {
  student: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/team", label: "My team", icon: UsersRound },
    { to: "/app/my-project", label: "My project", icon: FolderKanban },
  ],
  faculty: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/teams", label: "Team progress", icon: BarChart3 },
    { to: "/app/projects", label: "Projects", icon: FolderKanban },
  ],
  admin: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/teams", label: "Team progress", icon: BarChart3 },
    { to: "/app/projects", label: "Projects", icon: ClipboardList },
    { to: "/app/users", label: "Users", icon: Users },
    { to: "/app/faculty", label: "Faculty", icon: GraduationCap },
    { to: "/app/departments", label: "Departments", icon: Building2 },
    { to: "/app/audit", label: "Audit log", icon: ScrollText },
  ],
};

export const ACCOUNT_ITEM = { to: "/app/account", label: "Account", icon: UserCog };
