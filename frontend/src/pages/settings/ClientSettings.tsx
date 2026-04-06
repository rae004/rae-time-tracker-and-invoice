import { useState } from "react";
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from "../../hooks/useClients";
import { useToast } from "../../contexts/ToastContext";
import type { Client } from "../../types";
import { ProjectList } from "../../components/settings/ProjectList";

interface ClientFormData {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  hourly_rate: string;
  service_description: string;
}

const emptyClientForm: ClientFormData = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  hourly_rate: "100.00",
  service_description: "Software development services",
};

export function ClientSettings() {
  const { showToast } = useToast();
  const { data: clientsData, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>(emptyClientForm);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const clients = clientsData?.clients ?? [];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setFormData(emptyClientForm);
    setIsAddingClient(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      address_line1: client.address_line1,
      address_line2: client.address_line2 || "",
      city: client.city,
      state: client.state,
      zip_code: client.zip_code,
      phone: client.phone || "",
      hourly_rate: client.hourly_rate,
      service_description: client.service_description,
    });
    setIsAddingClient(true);
  };

  const handleCancel = () => {
    setEditingClient(null);
    setIsAddingClient(false);
    setFormData(emptyClientForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        address_line2: formData.address_line2 || null,
        phone: formData.phone || null,
      };

      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, data });
        showToast("Client updated successfully!", "success");
      } else {
        await createClient.mutateAsync(data);
        showToast("Client created successfully!", "success");
      }
      handleCancel();
    } catch {
      showToast(
        editingClient ? "Failed to update client" : "Failed to create client",
        "error"
      );
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete "${client.name}"? This will also delete all associated projects.`)) {
      return;
    }
    try {
      await deleteClient.mutateAsync(client.id);
      showToast("Client deleted successfully!", "success");
    } catch {
      showToast("Failed to delete client", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (isAddingClient) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h3 className="text-lg font-semibold">
            {editingClient ? "Edit Client" : "Add New Client"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card bg-base-200">
            <div className="card-body">
              <h4 className="font-medium">Client Information</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Client/Company Name *</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input input-bordered"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Phone</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input input-bordered"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Hourly Rate ($) *</span>
                  </label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    className="input input-bordered"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h4 className="font-medium">Billing Address</h4>

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Address Line 1 *</span>
                  </label>
                  <input
                    type="text"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    className="input input-bordered"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Address Line 2</span>
                  </label>
                  <input
                    type="text"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    className="input input-bordered"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="form-control col-span-2">
                    <label className="label">
                      <span className="label-text">City *</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">State *</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="input input-bordered"
                      maxLength={2}
                      required
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">ZIP *</span>
                    </label>
                    <input
                      type="text"
                      name="zip_code"
                      value={formData.zip_code}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h4 className="font-medium">Invoice Settings</h4>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Service Description</span>
                </label>
                <textarea
                  name="service_description"
                  value={formData.service_description}
                  onChange={handleChange}
                  className="textarea textarea-bordered"
                  placeholder="Software development services"
                />
                <label className="label">
                  <span className="label-text-alt">Appears on invoices under "FOR"</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={handleCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createClient.isPending || updateClient.isPending}
            >
              {(createClient.isPending || updateClient.isPending) ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : editingClient ? (
                "Update Client"
              ) : (
                "Create Client"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-base-content/70">
          Manage your clients and their projects.
        </p>
        <button className="btn btn-primary btn-sm" onClick={handleAddNew}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-8 text-base-content/50">
          No clients yet. Add your first client to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              isExpanded={expandedClientId === client.id}
              onToggle={() =>
                setExpandedClientId(
                  expandedClientId === client.id ? null : client.id
                )
              }
              onEdit={() => handleEdit(client)}
              onDelete={() => handleDelete(client)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ClientCardProps {
  client: Client;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientCard({ client, isExpanded, onToggle, onEdit, onDelete }: ClientCardProps) {
  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div
            className="flex-1 cursor-pointer"
            onClick={onToggle}
          >
            <h4 className="font-semibold">{client.name}</h4>
            <p className="text-sm text-base-content/70">
              ${client.hourly_rate}/hr
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={onToggle}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>
              Edit
            </button>
            <button className="btn btn-ghost btn-sm text-error" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-base-300">
            <ProjectList clientId={client.id} />
          </div>
        )}
      </div>
    </div>
  );
}
