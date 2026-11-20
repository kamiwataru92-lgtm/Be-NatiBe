import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, postJson } from "@/lib/api-client";

const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("postJson", () => {
  it("returns the parsed body on success", async () => {
    const f = vi.fn(async () => res(200, { ok: 1 }));
    await expect(postJson("/api/x", { a: 1 }, f)).resolves.toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledWith("/api/x", expect.objectContaining({ method: "POST", body: '{"a":1}' }));
  });
  it("sends the user to login on 401", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, pathname: "/lesson", search: "", assign });
    await expect(postJson("/api/x", {}, async () => res(401, { error: "unauthorized" }))).rejects.toMatchObject({ code: "unauthorized" });
    expect(assign).toHaveBeenCalledWith("/login?next=%2Flesson");
  });
  it("maps error codes", async () => {
    await expect(postJson("/api/x", {}, async () => res(502, { error: "ai_failed" }))).rejects.toMatchObject({ code: "ai_failed" });
    await expect(postJson("/api/x", {}, async () => res(429, { error: "rate_limited" }))).rejects.toMatchObject({ code: "rate_limited" });
    const err = await postJson("/api/x", {}, async () => { throw new TypeError("offline"); }).catch((e: ApiError) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("network");
  });
});
