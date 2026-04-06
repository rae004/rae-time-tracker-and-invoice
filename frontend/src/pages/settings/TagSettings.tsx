import { useState } from "react";
import {
  useCategoryTags,
  useCreateCategoryTag,
  useUpdateCategoryTag,
  useDeleteCategoryTag,
} from "../../hooks/useCategoryTags";
import { useToast } from "../../contexts/ToastContext";
import type { CategoryTag } from "../../types";

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
];

export function TagSettings() {
  const { showToast } = useToast();
  const { data: tagsData, isLoading } = useCategoryTags();
  const createTag = useCreateCategoryTag();
  const updateTag = useUpdateCategoryTag();
  const deleteTag = useDeleteCategoryTag();

  const [isAdding, setIsAdding] = useState(false);
  const [editingTag, setEditingTag] = useState<CategoryTag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(PRESET_COLORS[0]);

  const tags = tagsData?.tags ?? [];

  const handleAddTag = async () => {
    if (!tagName.trim()) return;
    try {
      await createTag.mutateAsync({
        name: tagName.trim(),
        color: tagColor,
      });
      setTagName("");
      setTagColor(PRESET_COLORS[0]);
      setIsAdding(false);
      showToast("Tag created!", "success");
    } catch {
      showToast("Failed to create tag", "error");
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !tagName.trim()) return;
    try {
      await updateTag.mutateAsync({
        id: editingTag.id,
        data: {
          name: tagName.trim(),
          color: tagColor,
        },
      });
      setTagName("");
      setTagColor(PRESET_COLORS[0]);
      setEditingTag(null);
      showToast("Tag updated!", "success");
    } catch {
      showToast("Failed to update tag", "error");
    }
  };

  const handleDeleteTag = async (tag: CategoryTag) => {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    try {
      await deleteTag.mutateAsync(tag.id);
      showToast("Tag deleted!", "success");
    } catch {
      showToast("Failed to delete tag", "error");
    }
  };

  const startEdit = (tag: CategoryTag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setIsAdding(false);
    setTagName("");
    setTagColor(PRESET_COLORS[0]);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-base-content/70">
          Create tags to categorize your time entries.
        </p>
        {!isAdding && !editingTag && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsAdding(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Tag
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingTag) && (
        <div className="card bg-base-200">
          <div className="card-body">
            <h4 className="font-medium">
              {editingTag ? "Edit Tag" : "New Tag"}
            </h4>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tag Name</span>
                </label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="input input-bordered"
                  placeholder="e.g., Development, Design, Meeting"
                  autoFocus
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Color</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        tagColor === color
                          ? "border-base-content scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTagColor(color)}
                    />
                  ))}
                  {/* Custom color picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                    />
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                        !PRESET_COLORS.includes(tagColor)
                          ? "border-base-content"
                          : "border-base-300"
                      }`}
                      style={{
                        backgroundColor: !PRESET_COLORS.includes(tagColor)
                          ? tagColor
                          : "transparent",
                      }}
                    >
                      {PRESET_COLORS.includes(tagColor) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Preview</span>
                </label>
                <div>
                  <span
                    className="badge badge-lg"
                    style={{ backgroundColor: tagColor, color: "#fff" }}
                  >
                    {tagName || "Tag Name"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={editingTag ? handleUpdateTag : handleAddTag}
                disabled={!tagName.trim() || createTag.isPending || updateTag.isPending}
              >
                {(createTag.isPending || updateTag.isPending) ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : editingTag ? (
                  "Update Tag"
                ) : (
                  "Create Tag"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags List */}
      {tags.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-base-content/50">
          No tags yet. Add your first tag to categorize time entries.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="card bg-base-200 hover:shadow-md transition-shadow"
            >
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => startEdit(tag)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleDeleteTag(tag)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
