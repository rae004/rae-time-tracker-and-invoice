import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DataExport, ImportResult, ResetResult } from "../types";

const API_BASE = "/api";

export const RESET_CONFIRM_HEADER = "X-Confirm-Reset";
export const RESET_CONFIRM_VALUE = "DELETE-ALL-DATA";

async function fetchExport(): Promise<{ payload: DataExport; filename: string }> {
  const response = await fetch(`${API_BASE}/data/export`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Export failed" }));
    throw new Error(typeof err.error === "string" ? err.error : "Export failed");
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `rae-time-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;

  const payload = (await response.json()) as DataExport;
  return { payload, filename };
}

export function downloadExportFile(payload: DataExport, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

export async function parseExportFile(file: File): Promise<DataExport> {
  const text = await readFileAsText(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("export_version" in parsed) ||
    !("data" in parsed)
  ) {
    throw new Error(
      "File does not look like a Rae Time Tracker export (missing export_version or data).",
    );
  }
  return parsed as DataExport;
}

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const { payload, filename } = await fetchExport();
      downloadExportFile(payload, filename);
      return { payload, filename };
    },
  });
}

export function useImportData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DataExport): Promise<ImportResult> => {
      const response = await fetch(`${API_BASE}/data/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Import failed" }));
        throw new Error(typeof err.error === "string" ? err.error : "Import failed");
      }
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useResetData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ResetResult> => {
      const response = await fetch(`${API_BASE}/data/reset`, {
        method: "DELETE",
        headers: { [RESET_CONFIRM_HEADER]: RESET_CONFIRM_VALUE },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Reset failed" }));
        throw new Error(typeof err.error === "string" ? err.error : "Reset failed");
      }
      return response.json() as Promise<ResetResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
