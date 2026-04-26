import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileSettings } from "./ProfileSettings";
import { createUserProfile } from "../../test/fixtures";

const mockUseUserProfile = vi.fn();
const mockUpdateAsync = vi.fn();
const mockShowToast = vi.fn();

vi.mock("../../hooks/useUserProfile", () => ({
  useUserProfile: () => mockUseUserProfile(),
  useUpdateUserProfile: () => ({
    mutateAsync: mockUpdateAsync,
    isPending: false,
  }),
}));

vi.mock("../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  mockUseUserProfile.mockReset();
  mockUpdateAsync.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
});

describe("ProfileSettings", () => {
  it("shows loading state", () => {
    mockUseUserProfile.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ProfileSettings />);
    expect(container.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("shows next invoice number from profile", () => {
    mockUseUserProfile.mockReturnValue({
      data: createUserProfile({ next_invoice_number: 1234 }),
      isLoading: false,
    });
    render(<ProfileSettings />);
    expect(screen.getByText("#1234")).toBeInTheDocument();
  });

  it("populates form fields from profile", async () => {
    mockUseUserProfile.mockReturnValue({
      data: createUserProfile({
        name: "Jane Doe",
        email: "jane@example.com",
        city: "Seattle",
      }),
      isLoading: false,
    });
    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Seattle")).toBeInTheDocument();
  });

  it("updates field on change", async () => {
    mockUseUserProfile.mockReturnValue({
      data: createUserProfile({ name: "Original" }),
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<ProfileSettings />);

    await waitFor(() => screen.getByDisplayValue("Original"));
    const nameInput = screen.getByDisplayValue("Original");
    await user.clear(nameInput);
    await user.type(nameInput, "New");
    expect(nameInput).toHaveValue("New");
  });

  it("submits form and shows success toast", async () => {
    mockUseUserProfile.mockReturnValue({
      data: createUserProfile(),
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<ProfileSettings />);

    await waitFor(() => screen.getByDisplayValue("John Doe"));
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(mockUpdateAsync).toHaveBeenCalled());
    expect(mockShowToast).toHaveBeenCalledWith(
      "Profile updated successfully!",
      "success",
    );
  });

  it("converts empty address_line2 to null when saving", async () => {
    mockUseUserProfile.mockReturnValue({
      data: createUserProfile({ address_line2: null }),
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<ProfileSettings />);

    await waitFor(() => screen.getByDisplayValue("John Doe"));
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(mockUpdateAsync).toHaveBeenCalled();
    });
    expect(mockUpdateAsync.mock.calls[0][0].address_line2).toBeNull();
  });

  it("shows error toast when save fails", async () => {
    mockUseUserProfile.mockReturnValue({
      data: createUserProfile(),
      isLoading: false,
    });
    mockUpdateAsync.mockRejectedValueOnce(new Error("fail"));
    const user = userEvent.setup();
    render(<ProfileSettings />);

    await waitFor(() => screen.getByDisplayValue("John Doe"));
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "Failed to update profile",
        "error",
      ),
    );
  });
});
