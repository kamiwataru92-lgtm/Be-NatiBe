import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IS_DEMO } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Be-NatiBe",
  description: "ネイティブの会話で、スラング・リスニング・伝える力を鍛える英語アプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b4c9b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {IS_DEMO && <p className="demo-banner">デモ版です。AI は使わず、毎回同じ会話が表示されます。</p>}
        {children}
      </body>
    </html>
  );
}
