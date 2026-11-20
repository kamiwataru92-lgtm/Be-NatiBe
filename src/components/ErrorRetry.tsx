const MESSAGES: Record<string, string> = {
  rate_limited: "混み合っています。少し待ってからもう一度試してください",
  network: "通信できませんでした。電波の良いところでもう一度試してください",
};

export function ErrorRetry({ code, message, onRetry }: { code?: string; message?: string; onRetry: () => void }) {
  return (
    <div className="notice" role="alert">
      <p>{message ?? (code && MESSAGES[code]) ?? "うまく作れませんでした。"}</p>
      <button className="btn" type="button" onClick={onRetry}>
        もう一度試す
      </button>
    </div>
  );
}
