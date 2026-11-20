import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { completeSession, DEFAULT_PROGRESS, saveProgress, setLevel } from "@/lib/storage";
import { ErrorRetry } from "@/components/ErrorRetry";
import { expr } from "../fixtures";

beforeEach(() => localStorage.clear());

describe("Home", () => {
  it("asks for the placement test first when no level is set", async () => {
    render(<Home />);
    expect(await screen.findByRole("link", { name: "まずはレベル診断" })).toHaveAttribute("href", "/placement");
    expect(screen.queryByRole("link", { name: "今日の学習をはじめる" })).toBeNull();
  });
  it("shows level, session count and the start button when a level is set", async () => {
    saveProgress(completeSession(setLevel(DEFAULT_PROGRESS, "advanced"), [expr("gonna")], "t"));
    render(<Home />);
    expect(await screen.findByRole("link", { name: "今日の学習をはじめる" })).toHaveAttribute("href", "/lesson");
    expect(screen.getByText("上級", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("1 回", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "レベルを変える" })).toHaveValue("advanced");
    expect(screen.getByRole("link", { name: /表現リスト/ })).toHaveAttribute("href", "/expressions");
  });
});

describe("ErrorRetry", () => {
  it("explains rate limits differently", () => {
    render(<ErrorRetry code="rate_limited" onRetry={() => {}} />);
    expect(screen.getByText("混み合っています。少し待ってからもう一度試してください")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });
  it("uses the default message otherwise", () => {
    render(<ErrorRetry onRetry={() => {}} />);
    expect(screen.getByText("うまく作れませんでした。")).toBeInTheDocument();
  });
});
