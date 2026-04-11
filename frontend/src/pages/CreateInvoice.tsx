import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "../hooks/useClients";
import { useInvoicePreview, useCreateInvoice } from "../hooks/useInvoices";
import { useToast } from "../contexts/ToastContext";
import type { InvoicePreview, InvoiceLineItemCreate } from "../types";

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDefaultDateRange(): { start: string; end: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Calculate last Friday (end of previous week)
  const daysToLastFriday = dayOfWeek === 6 ? 1 : dayOfWeek + 2;
  const lastFriday = new Date(today);
  lastFriday.setDate(today.getDate() - daysToLastFriday);

  // Calculate the Saturday before that (start of that week)
  const lastSaturday = new Date(lastFriday);
  lastSaturday.setDate(lastFriday.getDate() - 6);

  return {
    start: lastSaturday.toISOString().split("T")[0],
    end: lastFriday.toISOString().split("T")[0],
  };
}

export function CreateInvoice() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: clientsData, isLoading: loadingClients } = useClients();
  const previewInvoice = useInvoicePreview();
  const createInvoice = useCreateInvoice();

  const defaultDates = getDefaultDateRange();
  const [clientId, setClientId] = useState("");
  const [periodStart, setPeriodStart] = useState(defaultDates.start);
  const [periodEnd, setPeriodEnd] = useState(defaultDates.end);
  const [excludedEntries, setExcludedEntries] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [taxRate, setTaxRate] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");

  const clients = clientsData?.clients ?? [];

  // Load preview when parameters change
  useEffect(() => {
    if (clientId && periodStart && periodEnd) {
      previewInvoice.mutate(
        {
          client_id: clientId,
          period_start: periodStart,
          period_end: periodEnd,
          exclude_entry_ids: Array.from(excludedEntries),
        },
        {
          onSuccess: (data) => {
            setPreview(data);
          },
          onError: () => {
            setPreview(null);
          },
        }
      );
    } else {
      setPreview(null);
    }
  }, [clientId, periodStart, periodEnd, excludedEntries]);

  const toggleEntryExclusion = (entryId: string) => {
    setExcludedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const calculateAdjustedTotals = () => {
    if (!preview) return { subtotal: 0, tax: 0, total: 0 };

    const activeItems = preview.line_items.filter(
      (item) => !item.time_entry_id || !excludedEntries.has(item.time_entry_id)
    );

    const subtotal = activeItems.reduce(
      (sum, item) => sum + parseFloat(item.amount),
      0
    );

    const tax = subtotal * (parseFloat(taxRate) / 100);
    const other = parseFloat(otherCharges) || 0;
    const total = subtotal + tax + other;

    return { subtotal, tax, total };
  };

  const handleCreate = async (finalize: boolean = false) => {
    if (!preview) return;

    const activeItems = preview.line_items.filter(
      (item) => !item.time_entry_id || !excludedEntries.has(item.time_entry_id)
    );

    if (activeItems.length === 0) {
      showToast("No line items to invoice", "error");
      return;
    }

    try {
      const invoice = await createInvoice.mutateAsync({
        client_id: clientId,
        period_start: periodStart,
        period_end: periodEnd,
        hourly_rate: preview.hourly_rate,
        tax_rate: (parseFloat(taxRate) / 100).toString(),
        other_charges: otherCharges,
        line_items: activeItems,
      });

      showToast("Invoice created!", "success");
      navigate(`/invoices/${invoice.id}`);
    } catch {
      showToast("Failed to create invoice", "error");
    }
  };

  const totals = calculateAdjustedTotals();

  if (loadingClients) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate("/invoices")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold">Create Invoice</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">Invoice Details</h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Client *</span>
                </label>
                <select
                  className="select select-bordered"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} (${client.hourly_rate}/hr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Period Start *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Period End *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="divider"></div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Tax Rate (%)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Other Charges ($)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          {preview && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg">Summary</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {parseFloat(taxRate) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Tax ({taxRate}%)</span>
                      <span>{formatCurrency(totals.tax)}</span>
                    </div>
                  )}
                  {parseFloat(otherCharges) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Other</span>
                      <span>{formatCurrency(parseFloat(otherCharges))}</span>
                    </div>
                  )}
                  <div className="divider my-1"></div>
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-primary">{formatCurrency(totals.total)}</span>
                  </div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleCreate(false)}
                    disabled={!preview || preview.line_items.length === 0 || createInvoice.isPending}
                  >
                    {createInvoice.isPending ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Create Draft"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Preview */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">
                Line Items Preview
                {previewInvoice.isPending && (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
              </h2>

              {!clientId ? (
                <div className="text-center py-8 text-base-content/50">
                  Select a client to preview time entries.
                </div>
              ) : !preview ? (
                <div className="text-center py-8 text-base-content/50">
                  {previewInvoice.isPending ? "Loading..." : "No time entries found for this period."}
                </div>
              ) : preview.line_items.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                  No completed time entries found for this client and period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>
                          <label className="cursor-pointer">
                            Include
                          </label>
                        </th>
                        <th>Project</th>
                        <th>Date</th>
                        <th className="text-right">Hours</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.line_items.map((item, index) => {
                        const isExcluded = item.time_entry_id && excludedEntries.has(item.time_entry_id);
                        return (
                          <tr key={index} className={isExcluded ? "opacity-50" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={!isExcluded}
                                onChange={() => item.time_entry_id && toggleEntryExclusion(item.time_entry_id)}
                                disabled={!item.time_entry_id}
                              />
                            </td>
                            <td>{item.project_name}</td>
                            <td>{formatDate(item.work_date)}</td>
                            <td className="text-right">{parseFloat(item.hours).toFixed(2)}</td>
                            <td className="text-right">{formatCurrency(item.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td colSpan={3}>Total</td>
                        <td className="text-right">
                          {preview.line_items
                            .filter((item) => !item.time_entry_id || !excludedEntries.has(item.time_entry_id))
                            .reduce((sum, item) => sum + parseFloat(item.hours), 0)
                            .toFixed(2)}
                        </td>
                        <td className="text-right">{formatCurrency(totals.subtotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
