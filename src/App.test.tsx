import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Rai pharmacy intelligence workspace", () => {
  it("presents a simple chat-first Rai workspace and clean new-chat start state", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Rai" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What can Rai help with?" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "New chat" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Search chats")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
    expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate monthly sales report" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Predict stockouts" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Current report" })).not.toBeInTheDocument();
  });

  it("collapses the sidebar to a compact rail and supports dark mode", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getAllByRole("button", { name: "Expand sidebar" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("switch", { name: "Dark mode" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Expand sidebar" })[1]);
    const themeSwitch = screen.getByRole("switch", { name: "Dark mode" });
    await user.click(themeSwitch);

    expect(screen.getByRole("switch", { name: "Light mode" })).toHaveAttribute("aria-checked", "true");
  });

  it("renders Pharmacy Pulse as a formatted card inside the chat thread", async () => {
    const user = userEvent.setup();
    render(<App />);

    await ask(user, "What changed in my pharmacy today?");

    const conversation = screen.getByRole("log", { name: "Conversation" });
    await screen.findAllByText("What changed in my pharmacy today?");
    expect(conversation).toHaveTextContent("What changed in my pharmacy today?");
    expect(conversation).toHaveTextContent("Pharmacy Pulse");
    expect(conversation).toHaveTextContent("Health Score");
    expect(conversation).toHaveTextContent("91/100");
    expect(conversation).toHaveTextContent("Recommended Action");
    expect(conversation).toHaveTextContent("Reorder Exforge 10/160");
  });

  it("answers several pharmacy intelligence questions with grounded reports", async () => {
    const user = userEvent.setup();
    render(<App />);

    await ask(user, "How many unique patients are on Exforge 10/160 in March?");
    expect((await screen.findAllByText(/3 unique patients/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Tool used: get_unique_patients_on_medication")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Insight" })).toBeInTheDocument();

    await ask(user, "Generate report on total antihypertensives dispensed in March");
    expect((await screen.findAllByText(/390 tablets/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Tool used: get_medication_category_usage")).toBeInTheDocument();

    await ask(user, "What should I reorder for Aprovel for seven months?");
    expect((await screen.findAllByText(/3,240 tablets/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Tool used: get_reorder_forecast")).toBeInTheDocument();
  });

  it("opens Apps with RxLedger as a connected ecosystem app", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Apps" }));

    expect(screen.getByRole("heading", { name: "Apps" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RxLedger" })).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("HMO integrations")).toBeInTheDocument();
  });

  it("saves exported Rai outputs into the Library", async () => {
    const user = userEvent.setup();
    render(<App />);

    await ask(user, "How many unique patients are on Exforge 10/160 in March?");
    await user.click(await screen.findByRole("button", { name: "Export PDF" }));
    await user.click(screen.getByRole("button", { name: "Library" }));

    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByText(/\.pdf$/i)).toBeInTheDocument();
  });

  it("searches through the current chat", async () => {
    const user = userEvent.setup();
    render(<App />);

    await ask(user, "How many unique patients are on Exforge 10/160 in March?");
    await user.click(screen.getByRole("button", { name: "Search chats" }));
    await user.type(screen.getByPlaceholderText("Search chats"), "Exforge");

    expect(screen.getByText("User prompt")).toBeInTheDocument();
    expect(screen.getAllByText(/Exforge/).length).toBeGreaterThan(0);
  });

  it("opens share choices and manages local project drafts", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByRole("button", { name: "Copy chat link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send to email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share to mobile apps" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy chat link" }));
    expect(screen.getByText("Chat link copied.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Projects" }));
    expect(screen.getAllByText("No projects yet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No saved chats yet").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "New project" }));
    expect(screen.getAllByText("Untitled pharmacy project").length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: "More options for Untitled pharmacy project" })[0]);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getAllByText("Untitled pharmacy project (renamed)").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Pin" }));
    expect(screen.getAllByText("Pinned").length).toBeGreaterThan(0);
  });

  it("answers beta business planning questions with agent route and recommendations", async () => {
    const user = userEvent.setup();
    render(<App />);

    await ask(user, "I have ₦500,000 budget, what should I buy to maximize profit and avoid stockout?");

    expect((await screen.findAllByText(/Amlodipine/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Tool used: build_restock_budget_plan")).toBeInTheDocument();
    expect(screen.getByText("Mode: client fallback")).toBeInTheDocument();
    expect(screen.getByText("Recommended actions")).toBeInTheDocument();
    expect(screen.getByText("Agent route")).toBeInTheDocument();
  });

  it("keeps unsafe write requests outside the MVP boundary", async () => {
    const user = userEvent.setup();
    render(<App />);

    await ask(user, "Change Aprovel stock");

    expect((await screen.findAllByText("Rai cannot run that request yet")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/read-only analytics/).length).toBeGreaterThan(0);
  });
});

async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  const box = screen.getByLabelText("Message Rai");
  fireEvent.change(box, { target: { value: question } });
  await user.click(screen.getByRole("button", { name: "Send message" }));
}
