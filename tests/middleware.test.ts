// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

const SECRET = "s".repeat(32);
beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.stubEnv("APP_PASSCODE", "sakura");
});
afterEach(() => vi.unstubAllEnvs());

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {} });

describe("middleware", () => {
  it("rejects API calls without a session with 401 JSON", async () => {
    const res = await middleware(req("/api/lesson"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });
  it("redirects pages to /login keeping the destination", async () => {
    const res = await middleware(req("/lesson"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?next=%2Flesson");
  });
  it("lets the login page and login API through", async () => {
    expect((await middleware(req("/login"))).headers.get("x-middleware-next")).toBe("1");
    expect((await middleware(req("/api/login"))).headers.get("x-middleware-next")).toBe("1");
  });
  it("lets requests with a valid session through", async () => {
    const token = await createSessionToken(SECRET, Date.now());
    expect((await middleware(req("/api/lesson", token))).headers.get("x-middleware-next")).toBe("1");
    expect((await middleware(req("/", token))).headers.get("x-middleware-next")).toBe("1");
  });

  it("lets everything through when no passcode is configured", async () => {
    vi.stubEnv("APP_PASSCODE", "");
    expect((await middleware(req("/api/lesson"))).headers.get("x-middleware-next")).toBe("1");
    expect((await middleware(req("/lesson"))).headers.get("x-middleware-next")).toBe("1");
  });
});
