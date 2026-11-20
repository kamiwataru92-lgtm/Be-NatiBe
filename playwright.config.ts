import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 375, height: 812 } },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { AI_MOCK: "1", APP_PASSCODE: "test-pass", SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-00" },
  },
});
