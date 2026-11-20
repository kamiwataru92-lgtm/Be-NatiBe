import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { AiError } from "@/lib/ai";

export class BadRequest extends Error {}

/** 入力の検証とエラーの変換をまとめた API ハンドラ */
export function jsonHandler<I, O>(schema: z.ZodType<I>, run: (input: I) => Promise<O>) {
  return async (req: NextRequest) => {
    const body = await req.json().catch(() => undefined);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    try {
      return NextResponse.json(await run(parsed.data));
    } catch (e) {
      if (e instanceof BadRequest) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      if (e instanceof AiError) {
        if (e.kind === "rate_limited") return NextResponse.json({ error: "rate_limited" }, { status: 429 });
        console.error(`[ai] ${e.kind}: ${e.message}`);
        return NextResponse.json({ error: "ai_failed", kind: e.kind }, { status: 502 });
      }
      console.error(e);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  };
}
