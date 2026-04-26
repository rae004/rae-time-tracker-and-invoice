import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";

vi.mock("./settings/ProfileSettings", () => ({
  ProfileSettings: () => <div data-testid="profile" />,
}));

vi.mock("./settings/ClientSettings", () => ({
  ClientSettings: () => <div data-testid="clients" />,
}));

vi.mock("./settings/TagSettings", () => ({
  TagSettings: () => <div data-testid="tags" />,
}));

describe("Settings", () => {
  it("renders the Settings heading", () => {
    render(<Settings />);
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("defaults to Profile tab", () => {
    render(<Settings />);
    expect(screen.getByTestId("profile")).toBeInTheDocument();
    expect(screen.queryByTestId("clients")).toBeNull();
    expect(screen.queryByTestId("tags")).toBeNull();
  });

  it("switches to Clients tab on click", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole("tab", { name: /Clients & Projects/i }));
    expect(screen.getByTestId("clients")).toBeInTheDocument();
    expect(screen.queryByTestId("profile")).toBeNull();
  });

  it("switches to Tags tab on click", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole("tab", { name: /tags/i }));
    expect(screen.getByTestId("tags")).toBeInTheDocument();
    expect(screen.queryByTestId("profile")).toBeNull();
  });

  it("applies tab-active class to the selected tab", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const profileTab = screen.getByRole("tab", { name: /profile/i });
    expect(profileTab.className).toContain("tab-active");

    const tagsTab = screen.getByRole("tab", { name: /tags/i });
    await user.click(tagsTab);
    expect(tagsTab.className).toContain("tab-active");
    expect(profileTab.className).not.toContain("tab-active");
  });
});
