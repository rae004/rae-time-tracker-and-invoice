import { Link } from "react-router-dom";
import { useInvoices, useDeleteInvoice, getInvoicePdfUrl } from "../hooks/useInvoices";
import { useToast } from "../contexts/ToastContext";
import type { InvoiceWithClient } from "../types";

function formatCurrency(amount: string): string {
  return `$${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Invoices() {
  const { showToast } = useToast();
  const { data: invoicesData, isLoading } = useInvoices();
  const deleteInvoice = useDeleteInvoice();

  const invoices = invoicesData?.invoices ?? [];

  const handleDelete = async (invoice: InvoiceWithClient) => {
    if (!confirm(`Delete invoice #${invoice.invoice_number}?`)) return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      showToast("Invoice deleted", "success");
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-base-content/70">
            Create and manage invoices for your clients.
          </p>
        </div>
        <Link to="/invoices/new" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold mt-4">No invoices yet</h3>
            <p className="text-base-content/70">
              Create your first invoice to get started billing clients.
            </p>
            <div className="mt-4">
              <Link to="/invoices/new" className="btn btn-primary">
                Create Invoice
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Period</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        #{invoice.invoice_number}
                      </Link>
                    </td>
                    <td>{invoice.client_name || "Unknown"}</td>
                    <td className="text-sm">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </td>
                    <td className="font-semibold">{formatCurrency(invoice.total)}</td>
                    <td>
                      <span
                        className={`badge ${
                          invoice.status === "finalized"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="btn btn-ghost btn-xs"
                        >
                          View
                        </Link>
                        {invoice.status === "finalized" && invoice.pdf_path && (
                          <a
                            href={getInvoicePdfUrl(invoice.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs"
                          >
                            PDF
                          </a>
                        )}
                        {invoice.status === "draft" && (
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handleDelete(invoice)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
