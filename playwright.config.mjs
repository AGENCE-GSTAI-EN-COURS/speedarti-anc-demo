import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./qa",
  timeout: 30000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4173", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "tablet", testMatch: /anc-(all-sections-audit|supabase-example|persistence-and-report)\.spec\.mjs/,
      use: { ...devices["iPad Mini"], defaultBrowserType: "chromium" } }
  ],
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 20000
  }
});