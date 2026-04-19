import { useState } from "react";
import {
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from "../hooks/useTimeEntries";
import { useActiveProjects } from "../hooks/useProjects";
import { useCategoryTags } from "../hooks/useCategoryTags";
import { useToast } from "../contexts/ToastContext";
import type { TimeEntryWithProject } from "../types";
import { formatDuration, formatTime, toLocalDatetime, toLocalMs, fromLocalDatetime } from "../utils/formatters";

interface TimeEntryCardProps {
  entry: TimeEntryWithProject;
  showDate?: boolean;
}

export function TimeEntryCard({ entry, showDate = false }: TimeEntryCardProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editProjectId, setEditProjectId] = useState(entry.project_id ?? "");
  const [editStartTime, setEditStartTime] = useState(toLocalDatetime(entry.start_time));
  const [editStartMs, setEditStartMs] = useState(toLocalMs(entry.start_time));
  const [editEndTime, setEditEndTime] = useState(
    entry.end_time ? toLocalDatetime(entry.end_time) : ""
  );
  const [editEndMs, setEditEndMs] = useState(
    entry.end_time ? toLocalMs(entry.end_time) : 0
  );
  const [editTagIds, setEditTagIds] = useState<string[]>(
    entry.tags.map((t) => t.id)
  );

  const { data: projectsData } = useActiveProjects();
  const { data: tagsData } = useCategoryTags();
  const updateEntry = useUpdateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const projects = projectsData?.projects ?? [];
  const tags = tagsData?.tags ?? [];

  const initStartTime = toLocalDatetime(entry.start_time);
  const initStartMs = toLocalMs(entry.start_time);
  const initEndTime = entry.end_time ? toLocalDatetime(entry.end_time) : "";
  const initEndMs = entry.end_time ? toLocalMs(entry.end_time) : 0;

  const startChanged = editStartTime !== initStartTime || editStartMs !== initStartMs;
  const endChanged = editEndTime !== initEndTime || editEndMs !== initEndMs;

  const handleSave = async () => {
    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        data: {
          name: editName,
          project_id: editProjectId || undefined,
          start_time: startChanged ? fromLocalDatetime(editStartTime, editStartMs) : undefined,
          end_time: editEndTime && endChanged ? fromLocalDatetime(editEndTime, editEndMs) : undefined,
          tag_ids: editTagIds,
        },
      });
      setIsEditing(false);
      showToast("Entry updated!", "success");
    } catch {
      showToast("Failed to update entry", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      await deleteEntry.mutateAsync(entry.id);
      showToast("Entry deleted!", "success");
    } catch {
      showToast("Failed to delete entry", "error");
    }
  };

  const toggleTag = (tagId: string) => {
    setEditTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (isEditing) {
    return (
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <div className="flex flex-col gap-3">
            {/* Task name */}
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Task name"
            />

            {/* Project selector */}
            <select
              className="select select-bordered select-sm w-full"
              value={editProjectId}
              onChange={(e) => setEditProjectId(e.target.value)}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {/* Start / End time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="form-control">
                <span className="label-text text-xs">Start Time</span>
                <input
                  type="datetime-local"
                  step="1"
                  className="input input-bordered input-sm w-full"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    className="input input-bordered input-xs w-20"
                    value={editStartMs}
                    onChange={(e) => setEditStartMs(Math.min(999, Math.max(0, parseInt(e.target.value) || 0)))}
                  />
                  <span className="text-xs text-base-content/50">ms</span>
                </div>
              </div>
              <div className="form-control">
                <span className="label-text text-xs">End Time</span>
                <input
                  type="datetime-local"
                  step="1"
                  className="input input-bordered input-sm w-full"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  disabled={entry.is_running}
                />
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    className="input input-bordered input-xs w-20"
                    value={editEndMs}
                    onChange={(e) => setEditEndMs(Math.min(999, Math.max(0, parseInt(e.target.value) || 0)))}
                    disabled={entry.is_running}
                  />
                  <span className="text-xs text-base-content/50">ms</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    className={`badge badge-sm cursor-pointer ${
                      editTagIds.includes(tag.id)
                        ? "badge-primary"
                        : "badge-outline"
                    }`}
                    style={
                      editTagIds.includes(tag.id)
                        ? { backgroundColor: tag.color, borderColor: tag.color }
                        : { borderColor: tag.color, color: tag.color }
                    }
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(entry.name);
                  setEditProjectId(entry.project_id ?? "");
                  setEditStartTime(toLocalDatetime(entry.start_time));
                  setEditStartMs(toLocalMs(entry.start_time));
                  setEditEndTime(entry.end_time ? toLocalDatetime(entry.end_time) : "");
                  setEditEndMs(entry.end_time ? toLocalMs(entry.end_time) : 0);
                  setEditTagIds(entry.tags.map((t) => t.id));
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={updateEntry.isPending}
              >
                {updateEntry.isPending ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Entry info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{entry.name}</h3>
            <p className="text-sm text-base-content/70">
              {entry.project_name || <span className="italic">No project</span>}
              {entry.client_name && (
                <span className="text-base-content/50">
                  {" "}
                  - {entry.client_name}
                </span>
              )}
            </p>
            {showDate && (
              <p className="text-xs text-base-content/50 mt-1">
                {formatTime(entry.start_time)}
                {entry.end_time && ` - ${formatTime(entry.end_time)}`}
              </p>
            )}
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="badge badge-xs"
                    style={{ backgroundColor: tag.color, color: "#fff" }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Duration and actions */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="font-mono font-semibold">
                {formatDuration(entry.duration_ms)}
              </div>
              {entry.is_running && (
                <span className="badge badge-success badge-xs">Running</span>
              )}
            </div>

            {/* Edit/Delete dropdown */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-sm btn-square">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32"
              >
                <li>
                  <button onClick={() => setIsEditing(true)}>Edit</button>
                </li>
                <li>
                  <button
                    onClick={handleDelete}
                    className="text-error"
                    disabled={deleteEntry.isPending}
                  >
                    Delete
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
