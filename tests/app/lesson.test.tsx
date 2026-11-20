import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LessonPage from "@/app/lesson/page";
import { DEFAULT_PROGRESS, loadProgress, saveProgress, setLevel } from "@/lib/storage";
import type { ChatTurn, SessionFeedback } from "@/lib/schemas";
import { sampleLesson } from "../fixtures";

const feedback: SessionFeedback = { understoodJa: "よく伝わりました", rewrites: [{ original: "I am tired", native: "I'm beat" }], structureJa: "理由を足そう", usedExpressions: [] };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

type Handler = (body: { history?: { role: string; text: string }[] }) => Response;
let handlers: Record<string, Handler>;
let calls: { path: string; body: { history?: { role: string; text: string }[] } }[];

beforeEach(() => {
  localStorage.clear();
  saveProgress(setLevel(DEFAULT_PROGRESS, "beginner"));
  calls = [];
  handlers = {
    "/api/lesson": () => json(200, sampleLesson),
    "/api/chat": (b) => json(200, { reply: `reply ${b.history?.length ?? 0}`, nativeVersion: b.history?.length ? "I'm kinda wiped" : null, noteJa: "" } satisfies ChatTurn),
    "/api/feedback": () => json(200, feedback),
  };
  vi.stubGlobal("fetch", vi.fn(async (path: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push({ path, body });
    return handlers[path](body);
  }));
});
afterEach(() => vi.unstubAllGlobals());

async function goToChat(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "次へ：表現を拾う" }));
  await user.click(await screen.findByRole("button", { name: "次へ：話してみる" }));
  await screen.findByText("reply 0");
}

async function say(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByRole("textbox", { name: "あなたの返事" }), text);
  await user.click(screen.getByRole("button", { name: "送る" }));
}

describe("Lesson flow", () => {
  it("runs all four steps with text input and saves the session", async () => {
    const user = userEvent.setup();
    render(<LessonPage />);
    expect(await screen.findByText("Hey, whatcha gettin'?")).toBeInTheDocument(); // no TTS in jsdom → script shown
    await goToChat(user);
    expect(screen.queryByRole("button", { name: /マイク/ })).toBeNull();
    for (let i = 1; i <= 5; i++) {
      await say(user, `answer ${i}`);
      await screen.findByText(`reply ${i * 2}`);
    }
    expect(screen.getByRole("textbox", { name: "あなたの返事" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "フィードバックを見る" }));
    expect(await screen.findByText("よく伝わりました")).toBeInTheDocument();
    expect(screen.getByText("I'm beat")).toBeInTheDocument();
    await waitFor(() => expect(loadProgress().sessionCount).toBe(1));
    expect(loadProgress().expressions.map((e) => e.phrase)).toEqual(["whatcha", "prolly", "grab a coffee"]);
  });

  it("disables sending for over-long input", async () => {
    const user = userEvent.setup();
    render(<LessonPage />);
    await goToChat(user);
    const box = screen.getByRole("textbox", { name: "あなたの返事" });
    await user.click(box);
    await user.paste("x".repeat(501));
    expect(screen.getByRole("button", { name: "送る" })).toBeDisabled();
  });

  it("keeps the draft and retries after an AI failure", async () => {
    const user = userEvent.setup();
    render(<LessonPage />);
    await goToChat(user);
    const ok = handlers["/api/chat"];
    handlers["/api/chat"] = () => json(502, { error: "ai_failed", kind: "refusal" });
    await say(user, "my words");
    expect(await screen.findByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "あなたの返事" })).toHaveValue("my words");
    handlers["/api/chat"] = ok;
    await user.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(await screen.findByText("reply 2")).toBeInTheDocument();
    expect(calls.at(-1)?.body.history?.at(-1)).toEqual({ role: "learner", text: "my words" });
  });

  it("shows the native version only when there is one", async () => {
    const user = userEvent.setup();
    render(<LessonPage />);
    await goToChat(user);
    expect(screen.queryByText(/ネイティブならこう言う/)).toBeNull();
    await say(user, "I am very tired");
    expect(await screen.findByText("I'm kinda wiped")).toBeInTheDocument();
  });

  it("retries lesson generation after a rate limit", async () => {
    handlers["/api/lesson"] = () => json(429, { error: "rate_limited" });
    const user = userEvent.setup();
    render(<LessonPage />);
    expect(await screen.findByText("混み合っています。少し待ってからもう一度試してください")).toBeInTheDocument();
    handlers["/api/lesson"] = () => json(200, sampleLesson);
    await user.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(await screen.findByText("Hey, whatcha gettin'?")).toBeInTheDocument();
  });
});
