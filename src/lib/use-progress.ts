"use client";

import { useCallback, useEffect, useState } from "react";
import { loadProgress, saveProgress, type Progress } from "@/lib/storage";

/** 端末に保存した学習データ。サーバー描画との食い違いを避けるため、読み込みは画面表示後に行う */
export function useProgress() {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => setProgress(loadProgress()), []);
  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev ?? loadProgress());
      saveProgress(next);
      return next;
    });
  }, []);
  return { progress, update };
}
