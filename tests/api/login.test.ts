// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/login/route";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const req = (body: unknown) =>
  new NextRequest("http://localhost/api/login", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/login", () => {
  it("sets a valid session cookie for the right passcode", async () => {
    vi.stubEnv("APP_PASSCODE", "sakura");
    vi.stubEnv("SESSION_SECRET", "s".repeat(32));
    const res = await POST(req({ passcode: "sakura" }));
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    await expect(verifySessionToken(cookie?.value, "s".repeat(32), Date.now())).resolves.toBe(true);
  });
  it("returns 401 for a wrong or missing passcode", async () => {
    vi.stubEnv("APP_PASSCODE", "sakura");
    vi.stubEnv("SESSION_SECRET", "s".repeat(32));
    expect((await POST(req({ passcode: "nope" }))).status).toBe(401);
    const res = await POST(req("{}"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_passcode" });
    expect((await POST(req("not json"))).status).toBe(401);
  });
  it("returns 500 when the passcode is not configured", async () => {
    vi.stubEnv("APP_PASSCODE", "");
    vi.stubEnv("SESSION_SECRET", "s".repeat(32));
    const res = await POST(req({ passcode: "" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "server_misconfigured" });
  });
});
