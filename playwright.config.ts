import { defineConfig, devices } from "@playwright/test"

/**
 * Fase 7 - Playwright flow test. Butuh server yang jalan (npm run dev atau
 * npm run start) dengan Postgres terisi seed data (npm run seed) di alamat
 * PLAYWRIGHT_BASE_URL (default http://localhost:3000). Tidak menyalakan
 * server sendiri (webServer) karena dev server biasanya sudah jalan
 * terpisah saat development -- lihat catatan di README/roadmap.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // skenario menyentuh data bersama (draft/double-check/dst), jalankan berurutan
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
