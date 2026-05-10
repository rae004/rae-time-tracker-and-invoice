import { useRef, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  parseExportFile,
  useExportData,
  useImportData,
  useResetData,
} from "../../hooks/useDataManagement";
import type { DataExport, ImportCounts, ResetResult } from "../../types";

const RESET_CONFIRM_TYPED_VALUE = "DELETE";

function countImportItems(payload: DataExport): number {
  const d = payload.data;
  return (
    (d.user_profile ? 1 : 0) +
    d.category_tags.length +
    d.clients.length +
    d.projects.length +
    d.time_entries.length +
    d.invoices.length
  );
}

function totalImported(counts: ImportCounts): number {
  return (
    counts.user_profile_created +
    counts.category_tags_created +
    counts.clients_created +
    counts.projects_created +
    counts.time_entries_created +
    counts.invoices_created
  );
}

function totalDeleted(result: ResetResult): number {
  return Object.values(result.deleted).reduce((sum, n) => sum + n, 0);
}

export function DataManagement() {
  const { showToast } = useToast();
  const exportMutation = useExportData();
  const importMutation = useImportData();
  const resetMutation = useResetData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<DataExport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync();
      showToast("Export downloaded!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Export failed",
        "error",
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setPendingImport(null);
    try {
      const parsed = await parseExportFile(file);
      setPendingImport(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not read file.");
    }
    // Reset input so picking the same file again still fires onChange
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    try {
      const result = await importMutation.mutateAsync(pendingImport);
      const total = totalImported(result.counts);
      showToast(
        `Imported ${total} item${total === 1 ? "" : "s"}.`,
        "success",
      );
      setPendingImport(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Import failed",
        "error",
      );
    }
  };

  const handleConfirmReset = async () => {
    try {
      const result = await resetMutation.mutateAsync();
      const total = totalDeleted(result);
      showToast(
        `Deleted ${total} record${total === 1 ? "" : "s"}.`,
        "success",
      );
      setResetModalOpen(false);
      setResetConfirmText("");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Reset failed",
        "error",
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Data Management</h2>
        <p className="text-sm text-base-content/70">
          Export your data to a JSON file, restore from a previous export, or
          reset everything.
        </p>
      </div>

      {/* Export */}
      <section className="space-y-2">
        <h3 className="font-semibold">Export</h3>
        <p className="text-sm text-base-content/70">
          Download a JSON file containing your profile, clients, projects,
          tags, time entries, and invoices.
        </p>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleExport}
          disabled={exportMutation.isPending}
          aria-label="Export Data"
        >
          {exportMutation.isPending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            "Export Data"
          )}
        </button>
      </section>

      <div className="divider my-0" />

      {/* Import */}
      <section className="space-y-2">
        <h3 className="font-semibold">Import</h3>
        <p className="text-sm text-base-content/70">
          Restore from a previously exported file. Existing clients, projects,
          and tags with matching names will be kept; new items are added.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="file-input file-input-bordered file-input-sm w-full max-w-sm"
          onChange={handleFileChange}
          aria-label="Import file"
        />

        {importError && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{importError}</span>
          </div>
        )}

        {pendingImport && (
          <div className="card bg-base-200 mt-2">
            <div className="card-body p-4">
              <h4 className="font-medium">Ready to import</h4>
              <p className="text-sm text-base-content/70">
                Export version <code>{pendingImport.export_version}</code> with{" "}
                {countImportItems(pendingImport)} item
                {countImportItems(pendingImport) === 1 ? "" : "s"}:
              </p>
              <ul className="text-sm list-disc list-inside text-base-content/70">
                {pendingImport.data.user_profile && <li>1 user profile</li>}
                {pendingImport.data.category_tags.length > 0 && (
                  <li>{pendingImport.data.category_tags.length} category tags</li>
                )}
                {pendingImport.data.clients.length > 0 && (
                  <li>{pendingImport.data.clients.length} clients</li>
                )}
                {pendingImport.data.projects.length > 0 && (
                  <li>{pendingImport.data.projects.length} projects</li>
                )}
                {pendingImport.data.time_entries.length > 0 && (
                  <li>{pendingImport.data.time_entries.length} time entries</li>
                )}
                {pendingImport.data.invoices.length > 0 && (
                  <li>{pendingImport.data.invoices.length} invoices</li>
                )}
              </ul>
              <div className="flex gap-2 justify-end mt-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPendingImport(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleConfirmImport}
                  disabled={importMutation.isPending}
                  aria-label="Confirm Import"
                >
                  {importMutation.isPending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    "Confirm Import"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="divider my-0" />

      {/* Reset */}
      <section className="space-y-2">
        <h3 className="font-semibold text-error">Danger Zone</h3>
        <p className="text-sm text-base-content/70">
          Permanently delete all data: profile, clients, projects, tags, time
          entries, and invoices. This cannot be undone.
        </p>
        <button
          className="btn btn-error btn-outline btn-sm"
          onClick={() => setResetModalOpen(true)}
        >
          Reset All Data
        </button>
      </section>

      {/* Reset confirmation modal */}
      {resetModalOpen && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">
              Reset all data?
            </h3>
            <p className="py-2 text-sm">
              This will permanently delete every record in every table. Type{" "}
              <code className="font-mono">{RESET_CONFIRM_TYPED_VALUE}</code> to
              confirm.
            </p>
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder={RESET_CONFIRM_TYPED_VALUE}
              aria-label="Reset confirmation"
              autoFocus
            />
            <div className="modal-action">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmText("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={handleConfirmReset}
                disabled={
                  resetConfirmText !== RESET_CONFIRM_TYPED_VALUE ||
                  resetMutation.isPending
                }
                aria-label="Delete Everything"
              >
                {resetMutation.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Delete Everything"
                )}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
