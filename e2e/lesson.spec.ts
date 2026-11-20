import { expect, test, type Page } from "@playwright/test";

async function noHorizontalScroll(page: Page) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(375);
}

test("login, placement, a full lesson and the expression list", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=%2F$/);
  await noHorizontalScroll(page);

  await page.getByLabel("合言葉").fill("wrong");
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect(page.getByText("合言葉が違います")).toBeVisible();
  await page.getByLabel("合言葉").fill("test-pass");
  await page.getByRole("button", { name: "はじめる" }).click();

  await page.getByRole("link", { name: "まずはレベル診断" }).click();
  await noHorizontalScroll(page);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "わからない" }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByLabel("あなたの返事").fill("Pretty good, thanks!");
    await page.getByRole("button", { name: "答える" }).click();
  }
  await expect(page.getByText("中級")).toBeVisible();
  await noHorizontalScroll(page);
  await page.getByRole("link", { name: "ホームへ" }).click();

  await page.getByRole("link", { name: "今日の学習をはじめる" }).click();
  await expect(page.getByText("Monday coffee run")).toBeVisible();
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: "次へ：表現を拾う" }).click();
  await expect(page.getByText("pull an all-nighter").first()).toBeVisible();
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: "次へ：話してみる" }).click();

  const box = page.getByLabel("あなたの返事");
  await expect(box).toBeEnabled();
  for (let i = 1; i <= 5; i++) {
    await box.fill(`I am very tired ${i}`);
    await page.getByRole("button", { name: "送る" }).click();
    await expect(page.getByText(`I am very tired ${i}`)).toBeVisible();
  }
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: "フィードバックを見る" }).click();
  await expect(page.getByRole("heading", { name: "話の組み立て" })).toBeVisible();
  await noHorizontalScroll(page);

  await page.getByRole("link", { name: "ホームに戻る" }).click();
  await expect(page.getByText("1 回")).toBeVisible();
  await page.getByRole("link", { name: /表現リスト/ }).click();
  await expect(page.getByRole("checkbox", { name: /no cap/ })).toBeVisible();
  await noHorizontalScroll(page);
});

test("API rejects requests without the passcode cookie", async ({ request }) => {
  const res = await request.post("/api/lesson", { data: { level: "beginner", sceneId: "cafe" } });
  expect(res.status()).toBe(401);
});
