import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, safeEqual, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  const secret = process.env.SESSION_SECRET;
  if (!passcode || !secret) return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { passcode?: unknown } | null;
  const given = typeof body?.passcode === "string" ? body.passcode : "";
  if (!given || !(await safeEqual(given, passcode))) {
    return NextResponse.json({ error: "invalid_passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret, Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
