# Be-NatiBe

文法の正確さよりも「ネイティブと自然に通じ合うこと」を重視した、アメリカ英語の学習アプリ（試作品）です。
1 回 10 分ほどで、次の 4 ステップを体験します。

1. **聞く** — ネイティブ同士の自然な短い会話を聞く（gonna / wanna などの崩れた言い方もそのまま）
2. **表現を拾う** — 会話に出てきたスラングやイディオムを、日本語の解説と一緒に確認する
3. **話してみる** — AI のネイティブキャラと同じ場面で 5 往復会話する（文字入力、対応ブラウザなら音声入力も可）
4. **フィードバック** — 「伝わり方」「ネイティブならこう言う」「話の組み立て」を受け取る

初回はレベル診断で、初級・中級・上級のどれから始めるかを決めます。学習の記録は使っている端末のブラウザにだけ保存されます。

- 設計書: `docs/superpowers/specs/2026-11-20-be-natibe-prototype-design.md`
- 実装計画: `docs/superpowers/plans/2026-11-20-be-natibe-prototype.md`

## 手元で動かす

Node.js 20 以上が必要です。

```bash
npm install
cp .env.example .env.local   # 中身を埋める（下の表）
npm run dev                  # http://localhost:3000
```

| 変数 | 内容 |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio で発行した Gemini API キー |
| `APP_PASSCODE` | アプリに入るための合言葉 |
| `SESSION_SECRET` | ログイン状態の署名用。`openssl rand -base64 32` で作った文字列 |
| `AI_MODEL` | 使うモデル（省略時 `gemini-flash-latest`） |
| `AI_MOCK` | `1` にすると AI を呼ばず決まったデータを返す。API キーなしで画面と流れを確認できる |

### Gemini API キーの取り方

1. [Google AI Studio](https://aistudio.google.com/) に Google アカウントでログインする
2. 「Get API key」からキーを発行する
3. 無料枠の 1 日あたりの上限は AI Studio の画面で確認できる（公開されておらず、変わることがある）

**無料のまま使うための注意**

- Google Cloud 側で**課金（Billing）を有効にしない**でください。無料枠のままなら請求は発生しません。
- 上限に達すると、アプリには「混み合っています。少し待ってからもう一度試してください」と表示されます。
- 無料枠では、送った内容が Google のサービス改善に使われる場合があります。個人情報は入力しないようにしてください。

## テスト

```bash
npm test                          # 単体テスト
npx playwright test --trace off   # ブラウザでの通しテスト（AI_MOCK=1 で自動起動）
```

## インターネットに公開する（Vercel）

1. [Vercel](https://vercel.com/) に GitHub アカウントでログインし、「Add New → Project」でこのリポジトリを選ぶ
2. 「Environment Variables」に `GEMINI_API_KEY`・`APP_PASSCODE`・`SESSION_SECRET` を入れる（`AI_MOCK` は入れない）
3. 「Deploy」を押す。発行された URL と合言葉を、使ってもらう人にだけ伝える

### 合言葉を変えたいとき

Vercel の環境変数 `APP_PASSCODE` を変えて再デプロイします。すでにログイン済みの人も締め出したい場合は、`SESSION_SECRET` も新しい値に変えてください。

## しくみのメモ

- AI の呼び出しは `src/lib/ai.ts` の 1 か所だけです。Claude など別の AI に替えるときはこのファイルを書き換えます。
- 読み上げはブラウザ内蔵の音声合成です。高品質な音声サービスに替えるときは `src/lib/speech/tts.ts` の `Speaker` インターフェースを実装したものに差し替えます。
- 対象言語の設定（場面のリスト、AI への指示）は `src/config/languages.ts` にまとまっています。
