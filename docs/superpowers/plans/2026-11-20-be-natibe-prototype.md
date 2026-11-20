# Be-NatiBe 試作品 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「聞く → 表現を拾う → 自分で返す → フィードバック」の10分学習を、合言葉付きの Web アプリとして動かす。

**Architecture:** Next.js（App Router）1つで画面とサーバー側 API を持つ。Claude 呼び出しはサーバー側の `generateStructured()` に集約し、出力は zod スキーマで検証した JSON。読み上げ・音声入力はブラウザ機能を差し替え可能なインターフェース越しに使い、学習データは localStorage に置く。

**Tech Stack:** Next.js 15 / React / TypeScript / `@anthropic-ai/sdk` / zod / Vitest（＋ @testing-library/react, jsdom）/ Playwright（既存インストール済みのものを使う）

**Spec:** `docs/superpowers/specs/2026-11-20-be-natibe-prototype-design.md`

## Global Constraints

- 対象言語はアメリカ英語（`en-US`）。言語固有の値は `src/config/languages.ts` だけに置く
- 外部サービスは Claude API のみ。API キーはサーバー側だけで使い、クライアントのバンドルに入れない（`import "server-only"`）
- 環境変数: `ANTHROPIC_API_KEY`, `APP_PASSCODE`, `SESSION_SECRET`, `CLAUDE_MODEL`（既定 `claude-opus-5-5`）, `CLAUDE_MOCK`（`1` で固定データを返す。ローカル確認・E2E 用）
- 合言葉なしでは `/login` 以外の画面も `/api/*`（`/api/login` を除く）も使えない
- フィードバックで文法の細かい誤りは、意味が通じなくなる場合だけ扱う
- 練習の会話は学習者の発言 5 回まで。学習者の1発言は 500 文字まで
- サーバー側に学習データを保存しない。評価収集・復習機能は作らない
- UI の文言は日本語。iPhone Safari の幅（375px）で横スクロールが出ない

## Review Focus

1. **Claude がエラー・拒否（`stop_reason: "refusal"`）・形式不正を返す** → 画面は落ちず「うまく作れませんでした。もう一度試す」ボタンを出す（Task 3, 5, 9 にテスト）
2. **音声認識がないブラウザ（Firefox、iOS の一部）や、声の一覧が空・遅延して届く** → テキスト入力だけで最後まで進める。読み上げは声の取得を最大 1 秒待ってから既定の声で話す（Task 7, 9 にテスト）
3. **localStorage が壊れている・使えない（プライベートモード）** → 既定値で動き、例外を出さない（Task 6 にテスト）
4. **学習の途中で Cookie が切れる・合言葉が変わる** → API は 401 JSON、画面は `/login` に移動して戻り先を保持（Task 4, 9 にテスト）
5. **空・長すぎる入力、6 回目の発言** → API が 400 を返し、画面は送信ボタンを無効化（Task 5, 9 にテスト）

---

## ファイル構成

```
src/
  config/languages.ts        言語設定（en-US のみ）
  lib/levels.ts              レベル定義と難易度パラメータ
  lib/schemas.ts             AI 出力とAPI入力の zod スキーマ・型
  lib/prompts.ts             AI への指示文の組み立て
  lib/claude.ts              Claude 呼び出し（server-only）
  lib/mock-fixtures.ts       CLAUDE_MOCK=1 用の固定データ
  lib/auth.ts                署名付きセッショントークン（Web Crypto）
  lib/storage.ts             localStorage の進捗管理
  lib/api-client.ts          画面から API を呼ぶ関数（401 → /login）
  lib/speech/tts.ts          読み上げ（Speaker インターフェース＋ブラウザ実装）
  lib/speech/stt.ts          音声入力（ブラウザ実装）
  middleware.ts              合言葉チェック
  app/login/page.tsx
  app/page.tsx               ホーム
  app/placement/page.tsx     初回診断
  app/lesson/page.tsx        学習（4ステップ）
  app/expressions/page.tsx   表現リスト
  app/api/login/route.ts
  app/api/lesson/route.ts
  app/api/chat/route.ts
  app/api/feedback/route.ts
  app/api/placement/route.ts
  components/lesson/ListenStep.tsx
  components/lesson/ExpressionsStep.tsx
  components/lesson/ChatStep.tsx
  components/lesson/FeedbackStep.tsx
  components/ErrorRetry.tsx
tests/   （src と同じ構成で *.test.ts(x)）
e2e/lesson.spec.ts
```

---

### Task 1: 土台・言語設定・レベル定義

**Files:**
- Create: `package.json` ほか Next.js 一式（`npx create-next-app@15 . --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*"`）、`vitest.config.ts`、`.env.example`
- Create: `src/config/languages.ts`, `src/lib/levels.ts`
- Test: `tests/config/languages.test.ts`, `tests/lib/levels.test.ts`

**Interfaces:**
- Produces:
  - `type Scene = { id: string; labelJa: string; descriptionEn: string }`
  - `type LanguageConfig = { id: string; labelJa: string; speechLang: string; nativeLabel: string; scenes: Scene[]; styleGuide: string }`（`styleGuide` は AI に渡す「この言語のネイティブらしさ」の英文指示）
  - `DEFAULT_LANGUAGE_ID = "en-US"`, `getLanguage(id: string): LanguageConfig`（未知の id は `Error`）
  - `type Level = "beginner" | "intermediate" | "advanced"`, `LEVELS: Level[]`, `LEVEL_LABEL_JA: Record<Level,string>`（初級/中級/上級）
  - `type LevelProfile = { speechRate: number; japaneseSupport: "heavy" | "medium" | "light"; slang: "basic" | "common" | "full"; lessonLines: [number, number] }`
  - `LEVEL_PROFILES: Record<Level, LevelProfile>` — beginner `{0.8, heavy, basic, [4,6]}`, intermediate `{0.95, medium, common, [6,8]}`, advanced `{1.05, light, full, [6,8]}`
  - `isLevel(v: unknown): v is Level`

- [ ] **Step 1:** create-next-app で土台を作り、`@anthropic-ai/sdk zod server-only` と dev に `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom` を入れる。`package.json` に `"test": "vitest run"`, `"e2e": "playwright test"`。`.env.example` に Global Constraints の 5 変数を書く
- [ ] **Step 2: 失敗するテストを書く**
  - `getLanguage("en-US").speechLang === "en-US"`、`scenes.length >= 6`、全 scene の `id` が一意
  - `getLanguage("xx")` が throw
  - `LEVEL_PROFILES.beginner.speechRate < LEVEL_PROFILES.advanced.speechRate`、`isLevel("advanced") === true`、`isLevel("expert") === false`
- [ ] **Step 3:** `npm test` → FAIL（モジュールなし）
- [ ] **Step 4:** 実装する。場面はカフェ、職場の雑談、パーティー、ルームメイトとの会話、SNS/テキスト、スポーツ観戦など 6 個以上
- [ ] **Step 5:** `npm test` → PASS、`npm run build` → 成功
- [ ] **Step 6:** コミット `feat: scaffold app with language and level config`

### Task 2: スキーマと指示文

**Files:**
- Create: `src/lib/schemas.ts`, `src/lib/prompts.ts`
- Test: `tests/lib/schemas.test.ts`, `tests/lib/prompts.test.ts`

**Interfaces:**
- Consumes: Task 1 の `LanguageConfig`, `Scene`, `Level`, `LEVEL_PROFILES`
- Produces（zod スキーマと `z.infer` 型を同名で export）:
  - `ExpressionSchema = { phrase: string; meaningJa: string; usageJa: string; casualness: 1|2|3; exampleEn: string }`
  - `LessonSchema = { title: string; sceneId: string; speakers: string[] (2〜3人); lines: { speaker: string; text: string }[]; expressions: Expression[] (3〜5個) }`
  - `ChatTurnSchema = { reply: string; nativeVersion: string | null; noteJa: string }`（`nativeVersion` は学習者の直前の発言をネイティブらしく言い換えたもの。十分自然なら null）
  - `SessionFeedbackSchema = { understoodJa: string; rewrites: { original: string; native: string }[]; structureJa: string; usedExpressions: string[] }`
  - `PlacementResultSchema = { level: Level; reasonJa: string }`
  - API 入力: `ChatMessage = { role: "learner" | "native"; text: string }`、`LearnerText = z.string().trim().min(1).max(500)`、`MAX_LEARNER_TURNS = 5`
  - `LessonRequestSchema = { level, sceneId }`、`ChatRequestSchema = { level, lesson: Lesson, history: ChatMessage[] }`（learner の text は `LearnerText`、learner 数 ≤ 5、空でなければ最後は learner。空の history は「場面の最初のネイティブ発言を取得する」呼び出し）、`FeedbackRequestSchema = { level, lesson, history }`、`PlacementRequestSchema = { answers: { questionId: string; answer: string }[] }`
  - `type Prompt = { system: string; user: string }`
  - `buildLessonPrompt(lang, level, scene): Prompt` / `buildChatPrompt(lang, level, lesson, history): { system: string; messages: { role: "user" | "assistant"; content: string }[] }` / `buildFeedbackPrompt(lang, level, lesson, history): Prompt` / `buildPlacementPrompt(lang, answers): Prompt`
  - `PLACEMENT_QUESTIONS: { id: string; kind: "listen" | "reply"; promptEn: string; choicesEn?: string[] }[]`（リスニング 3 問＋返答 2 問。判定は AI）

- [ ] **Step 1: 失敗するテストを書く**
  - `LessonSchema` が expressions 2 個 / 6 個を拒否、`casualness: 4` を拒否
  - `ChatRequestSchema` が learner 6 回、空文字、501 文字、最後が native の履歴を拒否し、空の history は受け入れる
  - `buildLessonPrompt(en, "beginner", scene).system` が `lang.styleGuide` と行数 `4`〜`6` を含む。advanced は `full` 相当の指示（"slang" と "natural speed" の語）を含む
  - `buildFeedbackPrompt` の system が「意味が通じない場合だけ文法を指摘する」旨の英文（"only if it blocks understanding" を含む）と「解説は日本語」指示を含む
  - `buildChatPrompt` が learner→`user`、native→`assistant` に写し、最初の native 発言を scene に沿って始める指示を含む
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する。指示文は英語で書き、日本語で返す項目（`*Ja`）を明示する。「教科書的な表現を避け、gonna/wanna などの縮約をそのまま書く」をレッスン生成の指示に入れる
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** コミット `feat: add AI output schemas and prompt builders`

### Task 3: Claude 呼び出し

**Files:**
- Create: `src/lib/claude.ts`, `src/lib/mock-fixtures.ts`
- Test: `tests/lib/claude.test.ts`

**Interfaces:**
- Consumes: Task 2 のスキーマ
- Produces:
  - `class AiError extends Error { kind: "refusal" | "invalid_output" | "upstream" }`
  - `generateStructured<T>(args: { name: "lesson" | "chatTurn" | "feedback" | "placement"; schema: z.ZodType<T>; system: string; messages: { role: "user" | "assistant"; content: string }[]; effort: "low" | "medium"; client?: Anthropic }): Promise<T>`

- [ ] **Step 1: 失敗するテストを書く**（`client` に偽物を注入）
  - 正常な JSON → スキーマ型で返る
  - `stop_reason: "refusal"` → `AiError` kind `refusal`
  - スキーマに合わない出力 → kind `invalid_output`
  - SDK が `Anthropic.APIError` を投げる → kind `upstream`
  - `CLAUDE_MOCK=1` のとき client を呼ばず `mock-fixtures` の `name` に対応するデータを返し、それがスキーマを通る
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する。`import "server-only"`。モデルは `process.env.CLAUDE_MODEL ?? "claude-opus-5-5"`、`max_tokens: 16000`、`thinking` は送らない（Opus 5.5 は adaptive が既定）、`output_config: { effort, format: zodOutputFormat(schema) }`。拒否時の自動切替のため `client.beta.messages.parse` に `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"` を付ける。インストールされた SDK の型で `beta.messages.parse` がこれらを受けない場合は `client.messages.parse`（fallbacks なし）にし、その旨を README に書く。`stop_reason` を `parsed_output` より先に確認する。会話は effort `low`、レッスン・フィードバック・診断は `medium`
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** コミット `feat: add structured Claude client with mock mode`

### Task 4: 合言葉

**Files:**
- Create: `src/lib/auth.ts`, `src/middleware.ts`, `src/app/api/login/route.ts`, `src/app/login/page.tsx`
- Test: `tests/lib/auth.test.ts`, `tests/api/login.test.ts`, `tests/middleware.test.ts`

**Interfaces:**
- Produces:
  - `SESSION_COOKIE = "bn_session"`, `SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30`
  - `createSessionToken(secret: string, nowMs: number): Promise<string>`（`<発行時刻>.<HMAC-SHA256 base64url>`、Web Crypto で middleware でも動く）
  - `verifySessionToken(token: string | undefined, secret: string, nowMs: number): Promise<boolean>`
  - `POST /api/login` body `{ passcode: string }` → 200 + `Set-Cookie`（HttpOnly, Secure（本番）, SameSite=Lax, Max-Age）/ 401 `{ error: "invalid_passcode" }`
  - middleware: 未認証の `/api/*` → 401 `{ error: "unauthorized" }`、未認証の画面 → `/login?next=<元のパス>` へリダイレクト。`/login`, `/api/login`, `/_next/*`, `favicon.ico` は通す

- [ ] **Step 1: 失敗するテストを書く**
  - 作ったトークンが検証を通る / 別 secret で落ちる / 31 日後に落ちる / 改ざん（1文字変更）で落ちる / undefined で false
  - login: 正しい合言葉で 200 と Cookie、違う合言葉・空 body で 401、`APP_PASSCODE` 未設定なら 500 `{ error: "server_misconfigured" }`
  - middleware: Cookie なしの `/api/lesson` → 401、`/lesson` → `/login?next=%2Flesson`、有効 Cookie → 通過
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する。合言葉の比較は長さに依存しない比較（両方を SHA-256 してから比較）。ログイン画面は合言葉 1 欄と「はじめる」ボタン、失敗時「合言葉が違います」、成功で `next`（`/` で始まる場合のみ）へ
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** コミット `feat: protect app with shared passcode`

### Task 5: API ルート

**Files:**
- Create: `src/app/api/{lesson,chat,feedback,placement}/route.ts`
- Test: `tests/api/routes.test.ts`

**Interfaces:**
- Consumes: Task 2 のリクエストスキーマ・指示文、Task 3 の `generateStructured`, `AiError`
- Produces（すべて POST、JSON）:
  - `/api/lesson` `LessonRequest` → `Lesson`
  - `/api/chat` `ChatRequest` → `ChatTurn`
  - `/api/feedback` `FeedbackRequest` → `SessionFeedback`
  - `/api/placement` `PlacementRequest` → `PlacementResult`
  - エラー: 入力不正 400 `{ error: "bad_request" }`、`AiError` 502 `{ error: "ai_failed", kind }`

- [ ] **Step 1: 失敗するテストを書く**（`generateStructured` を `vi.mock`）
  - 各ルートが正しい入力で 200 とモック値を返し、`name` と `effort` を正しく渡す
  - `/api/chat` に learner 6 回・501 文字・空文字 → 400
  - 未知の `sceneId`、不正な `level` → 400
  - `generateStructured` が `AiError("refusal")` → 502 `{ error: "ai_failed", kind: "refusal" }`
  - レスポンス本文に API キーやスタックトレースが含まれない
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する。言語は `DEFAULT_LANGUAGE_ID` 固定
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** コミット `feat: add lesson, chat, feedback and placement APIs`

### Task 6: 進捗の保存

**Files:**
- Create: `src/lib/storage.ts`
- Test: `tests/lib/storage.test.ts`

**Interfaces:**
- Consumes: Task 1 `Level`, Task 2 `Expression`
- Produces:
  - `type SavedExpression = Expression & { learned: boolean; firstSeenAt: string }`
  - `type Progress = { version: 1; level: Level | null; sessionCount: number; expressions: SavedExpression[] }`
  - `STORAGE_KEY = "be-natibe:progress"`, `DEFAULT_PROGRESS`
  - `loadProgress(store?: Storage): Progress` / `saveProgress(p: Progress, store?: Storage): void`
  - `setLevel(p, level): Progress` / `completeSession(p, expressions: Expression[], nowIso: string): Progress`（回数＋1、`phrase` を小文字・前後空白除去で比べて重複は追加しない）/ `toggleLearned(p, phrase): Progress`
  - 関数はすべて新しいオブジェクトを返す（元を変えない）

- [ ] **Step 1: 失敗するテストを書く**
  - 空のストレージ → `DEFAULT_PROGRESS`（level null, 回数 0）
  - 壊れた JSON、`version` 違い、`getItem` が throw → いずれも `DEFAULT_PROGRESS`、例外なし
  - `setItem` が throw（容量・プライベートモード）しても `saveProgress` は例外を出さない
  - `completeSession` で `"Gonna "` と `"gonna"` が 1 件にまとまる、`learned` は既存値を保つ
  - `toggleLearned` が true/false を切り替える
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する（`store` 省略時は `globalThis.localStorage`、取れなければメモリ上の値で動く）
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** コミット `feat: add local progress storage`

### Task 7: 読み上げと音声入力

**Files:**
- Create: `src/lib/speech/tts.ts`, `src/lib/speech/stt.ts`
- Test: `tests/lib/speech.test.ts`

**Interfaces:**
- Produces:
  - `interface Speaker { speakLines(lines: { speaker: string; text: string }[], opts: { rate: number; onLine?: (i: number) => void }): Promise<void>; stop(): void }` ← 将来の高品質音声はこのインターフェースを実装する
  - `createBrowserSpeaker(lang: string, synth?: SpeechSynthesis): Speaker | null`（音声合成がなければ null）
  - `assignVoices(voices: { name: string; lang: string }[], speakers: string[], lang: string): Record<string, string | null>`（`lang` に一致する声を話者ごとに別々に割り当て、足りなければ使い回し、なければ null）
  - `waitForVoices(synth, timeoutMs = 1000): Promise<SpeechSynthesisVoice[]>`
  - `isRecognitionSupported(win?: Window): boolean`
  - `startRecognition(lang: string, handlers: { onResult(text: string): void; onError(code: string): void; onEnd(): void }): { stop(): void } | null`

- [ ] **Step 1: 失敗するテストを書く**
  - `assignVoices` が en-US 3 声・話者 2 人で別々の声、1 声・話者 2 人で同じ声、en-US 0 声で null
  - `waitForVoices` が、声が空のまま `voiceschanged` が来ないとき 1 秒で空配列を返す（偽タイマー）、途中で来たらその声を返す
  - `createBrowserSpeaker` が `speechSynthesis` なしで null、`speakLines` が行ごとに `onLine` を呼び、`rate` を各発話に設定する
  - `isRecognitionSupported` が `SpeechRecognition` / `webkitSpeechRecognition` のどちらかで true、両方なしで false
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** コミット `feat: add swappable speech output and browser speech input`

### Task 8: ホーム・診断・表現リスト画面

**Files:**
- Create: `src/lib/api-client.ts`, `src/components/ErrorRetry.tsx`, `src/app/page.tsx`, `src/app/placement/page.tsx`, `src/app/expressions/page.tsx`, `src/app/globals.css`（既存を置き換え）
- Test: `tests/lib/api-client.test.ts`, `tests/app/home.test.tsx`, `tests/app/expressions.test.tsx`

**Interfaces:**
- Consumes: Task 2 型, Task 6 storage, Task 7 speech, Task 1 levels
- Produces:
  - `postJson<T>(path: string, body: unknown, fetchImpl?: typeof fetch): Promise<T>` — 401 なら `location.assign("/login?next=" + 現在のパス)` して `ApiError("unauthorized")`、それ以外の非 2xx は `ApiError(error コード)`
  - `class ApiError extends Error { code: string }`
  - `<ErrorRetry message?: string onRetry: () => void />` 既定文言「うまく作れませんでした。」ボタン「もう一度試す」

- [ ] **Step 1: 失敗するテストを書く**
  - `postJson` が 401 で `location.assign` を呼ぶ、502 で `ApiError("ai_failed")`
  - ホーム: level が null なら「まずはレベル診断」ボタンだけ、ある場合はレベル名・学習回数・「今日の学習をはじめる」・レベル変更セレクト・「表現リスト」リンクを表示
  - 表現リスト: 保存済み表現を表示し、チェックで `learned` が切り替わって保存される。0 件なら「まだ表現はありません」
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する。診断画面は `PLACEMENT_QUESTIONS` を 1 問ずつ出し（listen は読み上げボタン＋選択肢、reply はテキスト入力）、最後に `/api/placement` → 結果のレベルと理由を表示 → 保存してホームへ。スマホ幅前提の 1 カラム
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** コミット `feat: add home, placement and expressions screens`

### Task 9: 学習画面（4 ステップ）

**Files:**
- Create: `src/app/lesson/page.tsx`, `src/components/lesson/{ListenStep,ExpressionsStep,ChatStep,FeedbackStep}.tsx`
- Test: `tests/app/lesson.test.tsx`

**Interfaces:**
- Consumes: Task 8 `postJson`, `ErrorRetry`; Task 7 `Speaker`, `isRecognitionSupported`, `startRecognition`; Task 6 `completeSession`; Task 2 型と `MAX_LEARNER_TURNS`
- 各ステップは `{ lesson, level, onNext(): void }` を受ける（ChatStep は `onDone(history: ChatMessage[])`、FeedbackStep は `history` を受ける）

挙動:
- 開始時に場面をランダムに選び `/api/lesson`。読み込み中は「会話を準備しています…」
- **ListenStep:** 再生／停止、台本は「台本を見る」で表示。再生中の行を強調。速度は `LEVEL_PROFILES[level].speechRate`
- **ExpressionsStep:** 表現カード（フレーズ、意味、使う場面、カジュアル度を ★1〜3）
- **ChatStep:** 開始時に空の history で `/api/chat` を呼び、最初のネイティブ発言を表示する。学習者の発言ごとに返答と `nativeVersion`（あれば「ネイティブならこう言う」として発言の下に表示）。テキスト入力＋音声認識対応時のみマイクボタン。500 文字超・空・5 回到達で送信ボタン無効。5 回目の返答後「フィードバックを見る」
- **FeedbackStep:** `/api/feedback` → 通じたか／言い換え一覧／話の組み立て、を表示。表示できたら `completeSession` で保存。「ホームに戻る」
- どの API 失敗も `ErrorRetry` を出し、そのステップの呼び出しをやり直す

- [ ] **Step 1: 失敗するテストを書く**（`fetch` と Speaker をモック）
  - 4 ステップを順に進み、最後に `completeSession` 相当で sessionCount が 1 増え表現が保存される
  - 音声認識なし環境でマイクボタンが出ず、テキストだけで 5 回送れる
  - 6 回目は送れない（ボタン無効）、501 文字で無効
  - `/api/chat` が 502 → 「もう一度試す」→ 再送で成功し、学習者の入力が消えていない
  - `nativeVersion: null` のとき「ネイティブならこう言う」を出さない
- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3:** 実装する
- [ ] **Step 4:** `npm test` → PASS
- [ ] **Step 5:** コミット `feat: add four-step lesson flow`

### Task 10: README と通しの動作確認

**Files:**
- Modify: `README.md`
- Create: `playwright.config.ts`, `e2e/lesson.spec.ts`

- [ ] **Step 1: E2E を書く**（`CLAUDE_MOCK=1 APP_PASSCODE=test SESSION_SECRET=<32文字> npm run build && npm start` を webServer に設定、viewport 375×812）
  - `/` → `/login` に飛ぶ → 違う合言葉でエラー → 正しい合言葉 → 診断 → ホーム → 学習 4 ステップをテキスト入力で完走 → 表現リストに表現がある
  - 各画面で `document.documentElement.scrollWidth <= 375`
- [ ] **Step 2:** `npx playwright test --trace off` → PASS
- [ ] **Step 3:** README を書く: アプリの説明、ローカル起動（`.env.local` の作り方、`CLAUDE_MOCK=1` で API キーなしでも動く）、Vercel への公開手順（リポジトリ連携、5 つの環境変数、`SESSION_SECRET` は `openssl rand -base64 32`）、**Anthropic Console で利用上限（spend limit）を設定すること**、合言葉の変え方（`APP_PASSCODE` を変えて再デプロイ。既存の Cookie は `SESSION_SECRET` も変えれば無効化）、読み上げを高品質音声に替える場合は `Speaker` を実装すればよいこと
- [ ] **Step 4:** `npm test && npm run build && npx playwright test --trace off` がすべて通る
- [ ] **Step 5:** コミット `docs: add setup and deploy guide with e2e check`
