// Web Crypto だけを使うので、middleware（Edge）でもサーバー側ルートでも動く。

export const SESSION_COOKIE = "bn_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

const enc = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

/** 長さや内容によって比較時間が変わらない文字列比較 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function createSessionToken(secret: string, nowMs: number): Promise<string> {
  const issued = String(nowMs);
  return `${issued}.${await hmac(secret, issued)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, nowMs: number): Promise<boolean> {
  if (!token || !secret) return false;
  const [issued, sig, extra] = token.split(".");
  if (!issued || !sig || extra !== undefined || !/^\d+$/.test(issued)) return false;
  const issuedMs = Number(issued);
  if (nowMs - issuedMs > SESSION_MAX_AGE_SEC * 1000 || issuedMs - nowMs > 60_000) return false;
  return safeEqual(sig, await hmac(secret, issued));
}
