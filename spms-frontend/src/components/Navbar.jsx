import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Badge from "./Badge.jsx";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy font-display text-sm font-bold text-white">
            SP
          </div>
          <div>
            <p className="font-display text-base font-bold leading-tight text-navy">SPMS</p>
            <p className="text-[11px] leading-tight text-slate-400">
              Student Project Management System
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">{currentUser.name}</p>
              <p className="text-xs text-slate-400">{currentUser.email}</p>
            </div>
            <Badge tone={currentUser.role}>{currentUser.role}</Badge>
            <button onClick={handleLogout} className="btn-secondary">
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
