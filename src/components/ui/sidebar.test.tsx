import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { setViewportWidth } from "@/components/testing/viewport";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";

beforeEach(() => setViewportWidth(1440));

function DesktopToggle() {
  const { setOpen, open } = useSidebar();
  return <button onClick={() => setOpen(!open)}>{open ? "Collapse" : "Expand"}</button>;
}

function renderProvider() {
  render(
    <SidebarProvider>
      <DesktopToggle />
    </SidebarProvider>,
  );
}

describe("SidebarProvider", () => {
  it("AC-PRV-5: toggling keeps state in React and sets no cookie", async () => {
    renderProvider();
    await userEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(document.cookie).toBe("");
  });

  it("AC-PRV-5: Ctrl+B does not toggle the sidebar", async () => {
    renderProvider();
    await userEvent.keyboard("{Control>}b{/Control}");
    expect(screen.getByRole("button", { name: "Collapse" })).toBeInTheDocument();
    expect(document.cookie).toBe("");
  });
});
