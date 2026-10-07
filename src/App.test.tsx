import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { App } from "./App";

describe("Rai frontend", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens with a pharmacy intelligence prompt", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "What can Rai help with today?" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ask Rai" })).toBeInTheDocument();
  });

  it("sends a question to Rai's backend and renders its grounded response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        conversationId: "conversation-1",
        message: { id: "rai-1", role: "rai", text: "I need a date range before comparing sales.", createdAt: "2026-10-07T00:00:00.000Z" },
        provider: { id: "ollama", model: "llama3.2", grounded: false },
        grounding: { status: "no_operational_data", sources: [] },
        warnings: ["No verified RxLedger analytics data was available for this answer."]
      }
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: "Ask Rai" }), {
      target: { value: "Which medicines should I reorder?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByText("Which medicines should I reorder?")).toBeInTheDocument();
    expect(await screen.findByText("I need a date range before comparing sales.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/rai/chat", expect.objectContaining({ method: "POST" }));
  });

  it("can collapse the navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));

    expect(screen.getByLabelText("Rai application")).toHaveAttribute("data-sidebar", "collapsed");
  });
});
