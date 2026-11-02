import { useAuth } from "@/context/AuthContext";
import StudentDashboard from "@/pages/student/StudentDashboard";
import FacultyDashboard from "@/pages/faculty/FacultyDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "student") return <StudentDashboard />;
  if (user?.role === "faculty") return <FacultyDashboard />;
  return <AdminDashboard />;
}
