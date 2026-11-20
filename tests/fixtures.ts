import type { Lesson } from "@/lib/schemas";
export const expr = (phrase: string) => ({ phrase, meaningJa: "意味", usageJa: "場面", casualness: 2 as const, exampleEn: "ex" });
export const sampleLesson: Lesson = {
  title: "Coffee run",
  sceneId: "cafe",
  speakers: ["Sam", "Jess"],
  lines: [
    { speaker: "Sam", text: "Hey, whatcha gettin'?" },
    { speaker: "Jess", text: "Prolly just an iced latte." },
  ],
  expressions: [expr("whatcha"), expr("prolly"), expr("grab a coffee")],
};
