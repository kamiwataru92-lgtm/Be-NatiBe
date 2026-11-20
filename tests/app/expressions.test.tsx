import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpressionsPage from "@/app/expressions/page";
import { completeSession, DEFAULT_PROGRESS, loadProgress, saveProgress } from "@/lib/storage";
import { expr } from "../fixtures";

beforeEach(() => localStorage.clear());

describe("Expressions page", () => {
  it("shows an empty state", async () => {
    render(<ExpressionsPage />);
    expect(await screen.findByText("まだ表現はありません")).toBeInTheDocument();
  });
  it("toggles learned and saves it", async () => {
    saveProgress(completeSession(DEFAULT_PROGRESS, [expr("no cap")], "t"));
    render(<ExpressionsPage />);
    const box = await screen.findByRole("checkbox", { name: /no cap/ });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(loadProgress().expressions[0].learned).toBe(true);
  });
});
