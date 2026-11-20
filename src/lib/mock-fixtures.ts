import type { ChatTurn, Lesson, PlacementResult, SessionFeedback } from "@/lib/schemas";

export const MOCK_LESSON: Lesson = {
  title: "Monday coffee run",
  sceneId: "cafe",
  speakers: ["Jess", "Mike"],
  lines: [
    { speaker: "Jess", text: "Hey! You look kinda wiped. Rough weekend?" },
    { speaker: "Mike", text: "Ugh, don't even. I pulled an all-nighter finishing that deck." },
    { speaker: "Jess", text: "Oof. You gonna grab a coffee or what?" },
    { speaker: "Mike", text: "Yeah, I'm gonna need, like, a large cold brew. No cap." },
    { speaker: "Jess", text: "Lol, fair. My treat, you earned it." },
    { speaker: "Mike", text: "For real? You're a lifesaver." },
  ],
  expressions: [
    { phrase: "wiped", meaningJa: "へとへとに疲れた", usageJa: "友達や同僚に疲れていると言うとき", casualness: 2, exampleEn: "I'm totally wiped after that workout." },
    { phrase: "pull an all-nighter", meaningJa: "徹夜する", usageJa: "仕事や勉強で徹夜したと話すとき", casualness: 1, exampleEn: "I had to pull an all-nighter for the exam." },
    { phrase: "no cap", meaningJa: "マジで・嘘じゃなく", usageJa: "若い世代の友達同士。目上には使わない", casualness: 3, exampleEn: "That pizza was the best, no cap." },
    { phrase: "my treat", meaningJa: "私がおごるよ", usageJa: "食事や飲み物をおごるとき", casualness: 1, exampleEn: "Put your wallet away, it's my treat." },
  ],
};

export const MOCK_CHAT_TURN: ChatTurn = {
  reply: "Haha, totally. So what're you up to after work?",
  nativeVersion: "I'm kinda wiped, honestly.",
  noteJa: "「tired」より「wiped」を使うとぐっとネイティブっぽくなります。",
};

export const MOCK_FEEDBACK: SessionFeedback = {
  understoodJa: "言いたいことはしっかり伝わっていました。返事が短めなので、理由をひとこと足すと会話が続きやすくなります。",
  rewrites: [{ original: "I am very tired.", native: "I'm kinda wiped, honestly." }],
  structureJa: "最初に結論（疲れている）を言えていて良いです。次に「because …」で理由を足し、最後に相手に質問を返すと自然な流れになります。",
  usedExpressions: ["wiped"],
};

export const MOCK_PLACEMENT: PlacementResult = {
  level: "intermediate",
  reasonJa: "日常的な表現は聞き取れていますが、スラングの理解と自然な返答はこれから伸ばせます。",
};

export const MOCK_FIXTURES = {
  lesson: MOCK_LESSON,
  chatTurn: MOCK_CHAT_TURN,
  feedback: MOCK_FEEDBACK,
  placement: MOCK_PLACEMENT,
} as const;
