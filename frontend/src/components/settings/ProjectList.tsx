import { useState } from "react";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "../../hooks/useProjects";
import { useToast } from "../../contexts/ToastContext";
import type { Project } from "../../types";

interface ProjectListProps {
  clientId: string;
}

export function ProjectList({ clientId }: ProjectListProps) {
  const { showToast } = useToast();
  const { data: projectsData, isLoading } = useProjects({ client_id: clientId });
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isAdding, setIsAdding] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const projects = projectsData?.projects ?? [];

  const handleAddProject = async () => {
    if (!projectName.trim()) return;
    try {
      await createProject.mutateAsync({
        client_id: clientId,
        name: projectName.trim(),
        description: projectDescription.trim() || null,
      });
      setProjectName("");
      setProjectDescription("");
      setIsAdding(false);
      showToast("Project created!", "success");
    } catch {
      showToast("Failed to create project", "error");
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !projectName.trim()) return;
    try {
      await updateProject.mutateAsync({
        id: editingProject.id,
        data: {
          name: projectName.trim(),
          description: projectDescription.trim() || null,
        },
      });
      setProjectName("");
      setProjectDescription("");
      setEditingProject(null);
      showToast("Project updated!", "success");
    } catch {
      showToast("Failed to update project", "error");
    }
  };

  const handleToggleActive = async (project: Project) => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: { is_active: !project.is_active },
      });
      showToast(
        project.is_active ? "Project deactivated" : "Project activated",
        "success"
      );
    } catch {
      showToast("Failed to update project", "error");
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Delete project "${project.name}"?`)) return;
    try {
      await deleteProject.mutateAsync(project.id);
      showToast("Project deleted!", "success");
    } catch {
      showToast("Failed to delete project", "error");
    }
  };

  const startEdit = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingProject(null);
    setIsAdding(false);
    setProjectName("");
    setProjectDescription("");
  };

  if (isLoading) {
    return <span className="loading loading-spinner loading-sm"></span>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h5 className="font-medium text-sm">Projects</h5>
        {!isAdding && !editingProject && (
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setIsAdding(true)}
          >
            + Add Project
          </button>
        )}
      </div>

      {(isAdding || editingProject) && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="Project name"
              autoFocus
            />
            <input
              type="text"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="input input-bordered input-sm w-full"
              placeholder="Description (optional)"
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={editingProject ? handleUpdateProject : handleAddProject}
            disabled={!projectName.trim() || createProject.isPending || updateProject.isPending}
          >
            {editingProject ? "Save" : "Add"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
            Cancel
          </button>
        </div>
      )}

      {projects.length === 0 && !isAdding ? (
        <p className="text-sm text-base-content/50">No projects yet.</p>
      ) : (
        <ul className="space-y-1">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between py-2 px-3 bg-base-100 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className={project.is_active ? "" : "text-base-content/50 line-through"}>
                  {project.name}
                </span>
                {!project.is_active && (
                  <span className="badge badge-ghost badge-xs">Inactive</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleToggleActive(project)}
                >
                  {project.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => startEdit(project)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-ghost btn-xs text-error"
                  onClick={() => handleDeleteProject(project)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
