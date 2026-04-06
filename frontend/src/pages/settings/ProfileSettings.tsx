import { useState, useEffect } from "react";
import { useUserProfile, useUpdateUserProfile } from "../../hooks/useUserProfile";
import { useToast } from "../../contexts/ToastContext";

export function ProfileSettings() {
  const { showToast } = useToast();
  const { data: profile, isLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();

  const [formData, setFormData] = useState({
    name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip_code: "",
    email: "",
    phone: "",
    payment_instructions: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        address_line1: profile.address_line1 || "",
        address_line2: profile.address_line2 || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_code: profile.zip_code || "",
        email: profile.email || "",
        phone: profile.phone || "",
        payment_instructions: profile.payment_instructions || "",
      });
    }
  }, [profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        ...formData,
        address_line2: formData.address_line2 || null,
      });
      showToast("Profile updated successfully!", "success");
    } catch {
      showToast("Failed to update profile", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice number preview */}
      {profile && (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Next invoice number: <strong>#{profile.next_invoice_number}</strong></span>
        </div>
      )}

      {/* Personal Information */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Personal Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Full Name</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="John Doe"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="john@example.com"
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
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Address</h3>

          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Address Line 1</span>
              </label>
              <input
                type="text"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="123 Main Street"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Address Line 2 (Optional)</span>
              </label>
              <input
                type="text"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="Suite 100"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="form-control col-span-2">
                <label className="label">
                  <span className="label-text">City</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="San Francisco"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">State</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="CA"
                  maxLength={2}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">ZIP Code</span>
                </label>
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="94102"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-lg">Payment Instructions</h3>
          <p className="text-sm text-base-content/70 mb-2">
            These instructions will appear at the bottom of your invoices.
          </p>

          <div className="form-control">
            <textarea
              name="payment_instructions"
              value={formData.payment_instructions}
              onChange={handleChange}
              className="textarea textarea-bordered h-24"
              placeholder="Direct deposit preferred if possible, or make all checks payable to..."
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Save Profile"
          )}
        </button>
      </div>
    </form>
  );
}
