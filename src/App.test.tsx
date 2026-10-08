import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { App } from "./App";
import { deleteFile, listFiles, saveFile } from "./lib/local-files";

vi.mock("./lib/local-files", () => ({
  listFiles: vi.fn(),
  saveFile: vi.fn(),
  deleteFile: vi.fn(),
  downloadFile: vi.fn()
}));

beforeEach(() => {
  vi.mocked(listFiles).mockReset().mockResolvedValue([]);
  vi.mocked(saveFile).mockReset().mockResolvedValue("saved-file");
  vi.mocked(deleteFile).mockReset().mockResolvedValue(undefined);
});

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
    fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }));
    expect(screen.getByLabelText("Rai application")).toHaveAttribute("data-sidebar", "expanded");
  });

  it("shows honest empty notifications and working settings", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("No task notifications yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByLabelText("Rai application")).toHaveAttribute("data-theme", "dark");
  });

  it("only offers document uploads and disables sharing empty chats", () => {
    render(<App />);
    expect(screen.getByLabelText("Upload documents")).toHaveAttribute("accept", expect.stringContaining(".pdf"));
    expect(screen.getByRole("button", { name: "Share conversation" })).toBeDisabled();
  });
});

describe("Rai notifications, sharing, and local library", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function completeConversation() {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        conversationId: "conversation-focused",
        message: { id: "reply-focused", role: "rai", text: "Check stock before reordering.", createdAt: "2026-10-07T00:00:00.000Z" },
        provider: { id: "ollama", model: "llama3.2", grounded: false },
        grounding: { status: "no_operational_data", sources: [] },
        warnings: []
      }
    }), { status: 200, headers: { "content-type": "application/json" } })));
    render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: "Ask Rai" }), {
      target: { value: "What should I reorder?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Check stock before reordering.");
  }

  it("adds a notification after a response, marks it read, and clears it", async () => {
    await completeConversation();
    const notifications = screen.getByRole("button", { name: "Notifications" });
    expect(within(notifications).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Alerts" })).getByText("1")).toBeInTheDocument();

    fireEvent.click(notifications);
    const dialog = screen.getByRole("dialog", { name: "notifications" });
    expect(within(dialog).getByText("Rai finished responding to your question.")).toBeInTheDocument();
    expect(within(notifications).queryByText("1")).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Alerts" })).queryByText("1")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear notifications" }));
    expect(within(dialog).getByText("No task notifications yet.")).toBeInTheDocument();
  });

  it("opens the share dialog and copies the full transcript", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", Object.create(navigator, { clipboard: { value: { writeText } } }));
    await completeConversation();
    fireEvent.click(screen.getByRole("button", { name: "Share conversation" }));
    const dialog = screen.getByRole("dialog", { name: "share" });
    expect(within(dialog).getByText(/Review it for private pharmacy information/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy conversation" }));
    expect(await within(dialog).findByText("Conversation copied.")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledExactlyOnceWith("You:\nWhat should I reorder?\n\nRai:\nCheck stock before reordering.");
  });

  it("reports clipboard failure without claiming the conversation was copied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard denied"));
    vi.stubGlobal("navigator", Object.create(navigator, { clipboard: { value: { writeText } } }));
    await completeConversation();
    fireEvent.click(screen.getByRole("button", { name: "Share conversation" }));
    const dialog = screen.getByRole("dialog", { name: "share" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Copy conversation" }));
    expect(await within(dialog).findByText("Clipboard unavailable. Download instead.")).toBeInTheDocument();
    expect(within(dialog).queryByText("Conversation copied.")).not.toBeInTheDocument();
  });

  it.each(["photo.png", "installer.exe", "oversized.pdf"])("rejects invalid upload %s without saving it", async name => {
    const file = new File(["document"], name);
    if (name === "oversized.pdf") Object.defineProperty(file, "size", { value: 20 * 1024 * 1024 + 1 });
    render(<App />);
    fireEvent.change(screen.getByLabelText("Upload documents"), { target: { files: [file] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose document or data files up to 20 MB each. Media and executables are not supported.");
    expect(saveFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    expect(screen.getByText("No files yet.")).toBeInTheDocument();
  });

  it("lists existing local documents and deletes a document by its stored id", async () => {
    vi.mocked(listFiles).mockResolvedValue([{ id: "stored-report", name: "report.pdf", size: 1024,
      createdAt: "2026-10-07T00:00:00.000Z", blob: new Blob(["report"]) }]);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(listFiles).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Delete report.pdf" }));
    await screen.findByText("No files yet.");
    expect(deleteFile).toHaveBeenCalledExactlyOnceWith("stored-report");
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("saves an accepted document to the library and announces the save", async () => {
    const file = new File(["stock,count\naspirin,12"], "stock.CSV", { type: "text/csv" });
    render(<App />);
    await waitFor(() => expect(listFiles).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Upload documents"), { target: { files: [file] } });
    await waitFor(() => expect(saveFile).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      id: expect.any(String), name: "stock.CSV", size: file.size, createdAt: expect.any(String), blob: file
    })));
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    expect(await screen.findByText("stock.CSV")).toBeInTheDocument();
    expect(screen.queryByText("No files yet.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("stock.CSV saved to your local library.")).toBeInTheDocument();
  });

  it("reports a failed save without adding the document to the library", async () => {
    vi.mocked(saveFile).mockRejectedValue(new Error("Storage full"));
    render(<App />);
    fireEvent.change(screen.getByLabelText("Upload documents"), {
      target: { files: [new File(["report"], "report.pdf")] }
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save this file. Local storage may be full.");
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    expect(screen.getByText("No files yet.")).toBeInTheDocument();
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("keeps a listed document when deletion fails", async () => {
    vi.mocked(listFiles).mockResolvedValue([{ id: "stored-report", name: "report.pdf", size: 1024,
      createdAt: "2026-10-07T00:00:00.000Z", blob: new Blob(["report"]) }]);
    vi.mocked(deleteFile).mockRejectedValue(new Error("Storage unavailable"));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete report.pdf" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete this file.");
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
  });
});
