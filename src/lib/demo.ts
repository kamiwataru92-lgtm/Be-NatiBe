// GitHub Pages 用のデモ版。サーバーも AI も使わず、決まったデータを返す。
import { MOCK_CHAT_TURN, MOCK_FEEDBACK, MOCK_LESSON, MOCK_PLACEMENT } from "@/lib/mock-fixtures";

export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

const OPENING = "Hey! You look kinda wiped. Rough day?";

export function demoResponse(path: string, body: unknown): unknown {
  switch (path) {
    case "/api/lesson":
      return structuredClone(MOCK_LESSON);
    case "/api/feedback":
      return structuredClone(MOCK_FEEDBACK);
    case "/api/placement":
      return structuredClone(MOCK_PLACEMENT);
    case "/api/chat": {
      const history = (body as { history?: unknown[] } | null)?.history ?? [];
      return history.length === 0 ? { reply: OPENING, nativeVersion: null, noteJa: "" } : structuredClone(MOCK_CHAT_TURN);
    }
    default:
      throw new Error(`No demo data for ${path}`);
  }
}
