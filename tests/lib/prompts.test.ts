import { describe, expect, it } from "vitest";
import { getLanguage } from "@/config/languages";
import { buildChatPrompt, buildFeedbackPrompt, buildLessonPrompt, buildPlacementPrompt, PLACEMENT_QUESTIONS } from "@/lib/prompts";
import { sampleLesson } from "../fixtures";

const en = getLanguage("en-US");
const scene = en.scenes[0];

describe("buildLessonPrompt", () => {
  it("includes the style guide and the beginner line range", () => {
    const p = buildLessonPrompt(en, "beginner", scene);
    expect(p.system).toContain(en.styleGuide);
    expect(p.system).toMatch(/4\D+6/);
    expect(p.user).toContain(scene.descriptionEn);
  });
  it("asks for full slang at natural speed for advanced learners", () => {
    const p = buildLessonPrompt(en, "advanced", scene);
    expect(p.system).toMatch(/slang/i);
    expect(p.system).toMatch(/natural speed/i);
  });
});

describe("buildFeedbackPrompt", () => {
  it("limits grammar correction and asks for Japanese explanations", () => {
    const p = buildFeedbackPrompt(en, "intermediate", sampleLesson, [{ role: "learner", text: "I go cafe yesterday" }]);
    expect(p.system).toContain("only if it blocks understanding");
    expect(p.system).toMatch(/Japanese/);
    expect(p.user).toContain("I go cafe yesterday");
  });
});

describe("buildChatPrompt", () => {
  it("maps learner to user and native to assistant", () => {
    const p = buildChatPrompt(en, "beginner", sampleLesson, [
      { role: "native", text: "Hey!" },
      { role: "learner", text: "Hi" },
    ]);
    expect(p.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(p.messages.at(-1)?.content).toContain("Hi");
  });
  it("tells the model to open the scene when history is empty", () => {
    const p = buildChatPrompt(en, "beginner", sampleLesson, []);
    expect(p.messages).toHaveLength(1);
    expect(p.messages[0].role).toBe("user");
    expect(p.system).toMatch(/open the conversation/i);
  });
});

describe("placement", () => {
  it("has 3 listening and 2 reply questions", () => {
    expect(PLACEMENT_QUESTIONS.filter((q) => q.kind === "listen")).toHaveLength(3);
    expect(PLACEMENT_QUESTIONS.filter((q) => q.kind === "reply")).toHaveLength(2);
  });
  it("includes the learner answers in the prompt", () => {
    const p = buildPlacementPrompt(en, [{ questionId: PLACEMENT_QUESTIONS[0].id, answer: "MY_ANSWER" }]);
    expect(p.user).toContain("MY_ANSWER");
  });
});
