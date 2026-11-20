export type Scene = { id: string; labelJa: string; descriptionEn: string };

export type LanguageConfig = {
  id: string;
  labelJa: string;
  speechLang: string;
  nativeLabel: string;
  scenes: Scene[];
  /** AI に渡す「この言語のネイティブらしさ」の指示（英文） */
  styleGuide: string;
};

export const DEFAULT_LANGUAGE_ID = "en-US";

const LANGUAGES: Record<string, LanguageConfig> = {
  "en-US": {
    id: "en-US",
    labelJa: "アメリカ英語",
    speechLang: "en-US",
    nativeLabel: "American English",
    styleGuide:
      "Write the way Americans in their 20s and 30s actually talk today: contractions and reductions (gonna, wanna, kinda, y'know), fillers (like, I mean), current everyday slang and idioms, short turns, and natural interruptions. Avoid textbook phrasing.",
    scenes: [
      { id: "cafe", labelJa: "カフェで注文・雑談", descriptionEn: "Ordering and small talk with a barista at a busy coffee shop" },
      { id: "office", labelJa: "職場の雑談", descriptionEn: "Casual chat with a coworker by the coffee machine on a Monday" },
      { id: "party", labelJa: "ホームパーティー", descriptionEn: "Meeting a friend of a friend at a house party" },
      { id: "roommate", labelJa: "ルームメイトとの会話", descriptionEn: "Sorting out chores and weekend plans with a roommate" },
      { id: "texting", labelJa: "友達とのメッセージ", descriptionEn: "Texting a friend to make plans for tonight" },
      { id: "sports", labelJa: "スポーツ観戦", descriptionEn: "Watching a football game at a sports bar with friends" },
      { id: "shopping", labelJa: "買い物", descriptionEn: "Asking a store clerk for help finding the right size" },
    ],
  },
};

export function getLanguage(id: string): LanguageConfig {
  const lang = LANGUAGES[id];
  if (!lang) throw new Error(`Unknown language: ${id}`);
  return lang;
}
