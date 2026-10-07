import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";

describe("Rai frontend", () => {
  it("opens with a pharmacy intelligence prompt", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "What can Rai help with today?" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ask Rai" })).toBeInTheDocument();
  });

  it("adds a question and grounded-looking response in the chat thread", () => {
    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: "Ask Rai" }), {
      target: { value: "Which medicines should I reorder?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByText("Which medicines should I reorder?")).toBeInTheDocument();
    expect(screen.getByText("Rai is ready to analyse your pharmacy data.")).toBeInTheDocument();
  });

  it("can collapse the navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));

    expect(screen.getByLabelText("Rai application")).toHaveAttribute("data-sidebar", "collapsed");
  });
});
