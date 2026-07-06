import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 配置。
 *
 * 测试目标：devtool-local 页面（脱离 Chrome 扩展，同页面跑 Paper.js + Panel UI）。
 * webServer 自动启动 `pnpm run dev:local`，测试结束自动关闭。
 *
 * 运行：pnpm run test:e2e
 * 首次需手动：pnpm -w add -D @playwright/test && npx playwright install chromium
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    viewport: { width: 1400, height: 900 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm run dev:local',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
