import { useState } from "react";
import { useActiveTimer, useRunningDuration } from "../hooks/useActiveTimer";
import { useCreateTimeEntry, useStopTimer } from "../hooks/useTimeEntries";
import { useActiveProjects } from "../hooks/useProjects";
import { useCategoryTags } from "../hooks/useCategoryTags";
import { useToast } from "../contexts/ToastContext";
import { formatDuration } from "../utils/formatters";

export function TimerControls() {
  const { showToast } = useToast();
  const { activeEntry, invalidate } = useActiveTimer();
  const duration = useRunningDuration(activeEntry);
  const { data: projectsData } = useActiveProjects();
  const { data: tagsData } = useCategoryTags();

  const createEntry = useCreateTimeEntry();
  const stopTimer = useStopTimer();

  const [taskName, setTaskName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const projects = projectsData?.projects ?? [];
  const tags = tagsData?.tags ?? [];

  const handleStart = async () => {
    try {
      await createEntry.mutateAsync({
        project_id: selectedProjectId || undefined,
        name: taskName.trim() || undefined,
        tag_ids: selectedTagIds,
      });
      setTaskName("");
      setSelectedProjectId("");
      setSelectedTagIds([]);
      invalidate();
      showToast("Timer started!", "success");
    } catch {
      showToast("Failed to start timer", "error");
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;

    try {
      await stopTimer.mutateAsync(activeEntry.id);
      invalidate();
      showToast("Timer stopped!", "success");
    } catch {
      showToast("Failed to stop timer", "error");
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        {activeEntry ? (
          // Running timer display
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{activeEntry.name}</h2>
                <p className="text-sm text-base-content/70">
                  {activeEntry.project_id
                    ? projects.find((p) => p.id === activeEntry.project_id)?.name
                    : <span className="italic">No project assigned</span>}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-primary">
                  {formatDuration(duration)}
                </div>
                <div className="badge badge-success gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-content opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success-content"></span>
                  </span>
                  Running
                </div>
              </div>
            </div>
            {activeEntry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activeEntry.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="badge badge-sm"
                    style={{ backgroundColor: tag.color, color: "#fff" }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            <button
              className="btn btn-error btn-lg"
              onClick={handleStop}
              disabled={stopTimer.isPending}
            >
              {stopTimer.isPending ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  Stop Timer
                </>
              )}
            </button>
          </div>
        ) : (
          // Timer input form
          <div className="flex flex-col gap-4">
            <h2 className="card-title">Start Timer</h2>

            {/* Project selector */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Project</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task name input */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">What are you working on?</span>
              </label>
              <input
                type="text"
                placeholder="Enter task description..."
                className="input input-bordered w-full"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStart();
                }}
              />
            </div>

            {/* Tags selector */}
            {tags.length > 0 && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tags (optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      className={`badge badge-lg cursor-pointer transition-all ${
                        selectedTagIds.includes(tag.id)
                          ? "badge-primary"
                          : "badge-outline"
                      }`}
                      style={
                        selectedTagIds.includes(tag.id)
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : { borderColor: tag.color, color: tag.color }
                      }
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start button */}
            <button
              className="btn btn-primary btn-lg"
              onClick={handleStart}
              disabled={createEntry.isPending}
            >
              {createEntry.isPending ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Start Timer
                </>
              )}
            </button>

            {projects.length === 0 && (
              <div className="alert alert-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  No projects found. Create a client and project in Settings first.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
