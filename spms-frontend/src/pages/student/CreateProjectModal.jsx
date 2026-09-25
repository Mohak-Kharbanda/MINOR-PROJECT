import { useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CreateProjectModal({ onClose, onCreated }) {
  const { data, students, faculty, createProject } = useData();
  const { currentUser } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState(currentUser.department);
  const [facultyId, setFacultyId] = useState(faculty[0]?.id || "");
  const [teamMembers, setTeamMembers] = useState([]);

  const availableStudents = students.filter((s) => s.id !== currentUser.id);

  function toggleMember(id) {
    setTeamMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const project = createProject({
      title,
      description,
      department,
      facultyId,
      teamMembers,
      createdBy: currentUser.id,
    });
    onCreated?.(project);
    onClose();
  }

  return (
    <Modal title="Create New Project" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Project Title</label>
          <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            required
            rows={3}
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Department</label>
            <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {data.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Internal Guide</label>
            <select className="input" value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Team Members</label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {availableStudents.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={teamMembers.includes(s.id)}
                  onChange={() => toggleMember(s.id)}
                  className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy-light"
                />
                <span className="font-medium text-slate-700">{s.name}</span>
                <span className="text-xs text-slate-400">{s.usn}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">You'll be added automatically as team lead.</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Submit for Approval
          </button>
        </div>
      </form>
    </Modal>
  );
}
