import { useParams, useNavigate, Link } from "react-router-dom";
import { useInvoice, useFinalizeInvoice, useDeleteInvoice, getInvoicePdfUrl } from "../hooks/useInvoices";
import { useClient } from "../hooks/useClients";
import { useToast } from "../contexts/ToastContext";
import { formatCurrency, formatDateLong, formatDate } from "../utils/formatters";

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: invoice, isLoading } = useInvoice(id || "");
  const { data: client } = useClient(invoice?.client_id || "");
  const finalizeInvoice = useFinalizeInvoice();
  const deleteInvoice = useDeleteInvoice();

  const handleFinalize = async () => {
    if (!invoice) return;
    if (!confirm("Finalize this invoice? This action cannot be undone and the invoice cannot be edited after finalization.")) return;

    try {
      await finalizeInvoice.mutateAsync(invoice.id);
      showToast("Invoice finalized and PDF generated!", "success");
    } catch {
      showToast("Failed to finalize invoice", "error");
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm(`Delete invoice #${invoice.invoice_number}? This action cannot be undone.`)) return;

    try {
      await deleteInvoice.mutateAsync(invoice.id);
      showToast("Invoice deleted", "success");
      navigate("/invoices");
    } catch {
      showToast("Failed to delete invoice", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Invoice not found</h2>
        <Link to="/invoices" className="btn btn-primary mt-4">
          Back to Invoices
        </Link>
      </div>
    );
  }

  const taxAmount = parseFloat(invoice.subtotal) * parseFloat(invoice.tax_rate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <h1 className="text-2xl font-bold">Invoice #{invoice.invoice_number}</h1>
          <span
            className={`badge ${
              invoice.status === "finalized" ? "badge-success" : "badge-warning"
            }`}
          >
            {invoice.status}
          </span>
        </div>

        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <>
              <button
                className="btn btn-error btn-outline"
                onClick={handleDelete}
                disabled={deleteInvoice.isPending}
              >
                Delete
              </button>
              <button
                className="btn btn-primary"
                onClick={handleFinalize}
                disabled={finalizeInvoice.isPending}
              >
                {finalizeInvoice.isPending ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Finalize & Generate PDF"
                )}
              </button>
            </>
          )}
          {invoice.status === "finalized" && (
            <a
              href={getInvoicePdfUrl(invoice.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* Invoice Preview Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-2 border-amber-600 pb-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-amber-600">INVOICE</h2>
              <p className="text-base-content/70">#{invoice.invoice_number}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-base-content/70">
                Created: {formatDate(invoice.created_at)}
              </p>
            </div>
          </div>

          {/* Bill To / For / Rate Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-2">
                Bill To
              </h3>
              {client ? (
                <div className="text-sm">
                  <p className="font-semibold">{client.name}</p>
                  <p>{client.address_line1}</p>
                  {client.address_line2 && <p>{client.address_line2}</p>}
                  <p>{client.city}, {client.state} {client.zip_code}</p>
                  {client.phone && <p>{client.phone}</p>}
                </div>
              ) : (
                <p className="text-sm text-base-content/50">Loading client info...</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-2">
                For
              </h3>
              <p className="text-sm">{client?.service_description || "Software development services"}</p>
            </div>

            <div className="text-right">
              <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-2">
                Hourly Rate
              </h3>
              <p className="text-2xl font-bold">{formatCurrency(invoice.hourly_rate)}</p>
            </div>
          </div>

          {/* Period */}
          <div className="bg-base-200 rounded-lg p-4 mb-6">
            <span className="font-semibold">Period: </span>
            {formatDateLong(invoice.period_start)} - {formatDateLong(invoice.period_end)}
          </div>

          {/* Line Items */}
          <div className="overflow-x-auto mb-6">
            <table className="table">
              <thead>
                <tr className="bg-base-200">
                  <th>Project</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th className="text-center">Hours</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.project_name}</td>
                    <td>{item.time_entry_name || ""}</td>
                    <td>{formatDate(item.work_date)}</td>
                    <td className="text-center">{parseFloat(item.hours).toFixed(2)}</td>
                    <td className="text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70 uppercase text-sm">Subtotal</span>
                <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-base-200">
                <span className="text-base-content/70 uppercase text-sm">Tax Rate</span>
                <span>{(parseFloat(invoice.tax_rate) * 100).toFixed(2)}%</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-base-200">
                  <span className="text-base-content/70 uppercase text-sm">Tax Amount</span>
                  <span>{formatCurrency(taxAmount.toString())}</span>
                </div>
              )}
              {parseFloat(invoice.other_charges) > 0 && (
                <div className="flex justify-between py-2 border-b border-base-200">
                  <span className="text-base-content/70 uppercase text-sm">Other</span>
                  <span>{formatCurrency(invoice.other_charges)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-amber-600">
                <span className="font-bold text-lg">TOTAL</span>
                <span className="font-bold text-lg text-amber-600">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Thank You */}
          <div className="text-center pt-8 mt-8 border-t-2 border-amber-600">
            <p className="text-amber-600 font-semibold tracking-wide">
              THANK YOU FOR THE OPPORTUNITY!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
