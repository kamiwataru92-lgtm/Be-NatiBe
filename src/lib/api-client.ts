import { demoResponse } from "@/lib/demo";

export class ApiError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "ApiError";
  }
}

export async function postJson<T>(path: string, body: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  if (process.env.NEXT_PUBLIC_DEMO === "1") {
    await new Promise((r) => setTimeout(r, 400));
    return demoResponse(path, body) as T;
  }
  let res: Response;
  try {
    res = await fetchImpl(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("network");
  }
  if (res.status === 401) {
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    throw new ApiError("unauthorized");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError((data as { error?: string } | null)?.error ?? "unknown");
  return data as T;
}
