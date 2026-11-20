/** ログイン後の戻り先。同じサイト内のパスだけを許し、それ以外は "/" にする */
export function safeNext(next: string | null, origin: string): string {
  if (!next || !next.startsWith("/") || next.includes("\\")) return "/";
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}
