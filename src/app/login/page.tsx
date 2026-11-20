"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe-next";

function LoginForm() {
  const params = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        window.location.assign(safeNext(params.get("next"), window.location.origin));
        return;
      }
      setError(res.status === 401 ? "合言葉が違います" : "いまは入れません。管理者に連絡してください");
    } catch {
      setError("通信できませんでした。電波の良いところでもう一度試してください");
    }
    setBusy(false);
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <label className="field">
        <span>合言葉</span>
        <input type="password" autoComplete="current-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} required />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy || !passcode}>
        はじめる
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="page">
      <header className="hero">
        <h1 className="logo">Be-NatiBe</h1>
        <p className="muted">ネイティブの会話に、そのまま飛び込もう。</p>
      </header>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
