// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSessionToken, SESSION_MAX_AGE_SEC, verifySessionToken } from "@/lib/auth";

const SECRET = "s".repeat(32);
const NOW = Date.UTC(2026, 10, 20);

describe("session tokens", () => {
  it("verifies a token it created", async () => {
    const t = await createSessionToken(SECRET, NOW);
    await expect(verifySessionToken(t, SECRET, NOW + 1000)).resolves.toBe(true);
  });
  it("rejects a token signed with another secret", async () => {
    const t = await createSessionToken(SECRET, NOW);
    await expect(verifySessionToken(t, "x".repeat(32), NOW)).resolves.toBe(false);
  });
  it("rejects an expired token (31 days)", async () => {
    expect(SESSION_MAX_AGE_SEC).toBe(60 * 60 * 24 * 30);
    const t = await createSessionToken(SECRET, NOW);
    await expect(verifySessionToken(t, SECRET, NOW + 31 * 24 * 3600 * 1000)).resolves.toBe(false);
  });
  it("rejects a tampered token", async () => {
    const t = await createSessionToken(SECRET, NOW);
    const last = t.at(-1) === "A" ? "B" : "A";
    await expect(verifySessionToken(t.slice(0, -1) + last, SECRET, NOW)).resolves.toBe(false);
    const [, sig] = t.split(".");
    await expect(verifySessionToken(`${NOW + 5}.${sig}`, SECRET, NOW)).resolves.toBe(false);
  });
  it("rejects missing or malformed tokens", async () => {
    await expect(verifySessionToken(undefined, SECRET, NOW)).resolves.toBe(false);
    await expect(verifySessionToken("garbage", SECRET, NOW)).resolves.toBe(false);
  });
});
