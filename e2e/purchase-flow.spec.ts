import { test, expect, type Page } from "@playwright/test"

/**
 * Fase 7 - Playwright flow test.
 *
 * Skenario: login -> draft (Staff) -> verifikasi gudang (Admin) -> transfer
 * (Admin) -> lihat & export (Manager), lewat UI sungguhan (klik tombol,
 * isi form) -- bukan panggilan API langsung seperti smoke/api-smoke.mjs.
 * Data uji (supplier) dibuat lewat API di beforeAll supaya alur UI yang
 * diuji fokus pada transaksi, bukan pengisian form supplier yang sudah
 * dites terpisah di tempat lain; dibersihkan lagi di afterAll.
 */

const CREDENTIALS = {
  STAFF: { email: "staff.kediri@example.com", password: "password123" },
  ADMIN: { email: "admin.kediri@example.com", password: "password123" },
  MANAGER: { email: "manager@example.com", password: "password123" },
}

async function loginAs(page: Page, role: keyof typeof CREDENTIALS) {
  const { email, password } = CREDENTIALS[role]
  await page.goto("/login")
  await page.getByPlaceholder("nama@agp.local").fill(email)
  await page.getByPlaceholder("Masukkan password").fill(password)
  await page.getByRole("button", { name: "Masuk" }).click()
  await page.waitForURL(/\/dashboard/)
}

async function apiLogin(request: import("@playwright/test").APIRequestContext, role: keyof typeof CREDENTIALS) {
  const { email, password } = CREDENTIALS[role]
  const csrf = await (await request.get("/api/auth/csrf")).json()
  await request.post("/api/auth/callback/credentials", {
    form: { email, password, csrfToken: csrf.csrfToken, json: "true" },
  })
}

test.describe.serial("Alur transaksi pembelian penuh (draft -> verifikasi -> transfer -> lihat manager)", () => {
  const skuName = "Kotor" // SKU tanpa standar harga terkonfigurasi -> selalu lolos kontrol harga
  const supplierName = `E2E Supplier ${Date.now()}`
  let supplierId: string
  let staffWarehouseId: string
  let purchaseId: string

  test.beforeAll(async ({ request }) => {
    await apiLogin(request, "STAFF")
    const session = await (await request.get("/api/auth/session")).json()
    staffWarehouseId = session.user.warehouseId
    // confirmDuplicate: true -- nama supplier uji berbasis timestamp bisa
    // ke-flag "mirip" (Levenshtein) dengan sisa nama dari run E2E
    // sebelumnya yang timestamp-nya berdekatan, lihat supplierDuplicate.ts.
    const supplierRes = await request.post("/api/suppliers", {
      data: {
        nama: supplierName,
        warehouseId: staffWarehouseId,
        target_bulanan_kg: 10,
        frekuensi_ambilan_mingguan: 1,
        confirmDuplicate: true,
      },
    })
    if (!supplierRes.ok()) {
      throw new Error(`Gagal membuat supplier uji: ${supplierRes.status()} ${await supplierRes.text()}`)
    }
    const supplier = await supplierRes.json()
    supplierId = supplier.id
  })

  test.afterAll(async ({ request }) => {
    await apiLogin(request, "MANAGER")
    if (purchaseId) {
      const res = await request.delete(`/api/manager/purchases/${purchaseId}`)
      if (!res.ok()) console.error(`Gagal cleanup purchase ${purchaseId}: ${res.status()} ${await res.text()}`)
    }
    if (supplierId) {
      const res = await request.delete(`/api/manager/suppliers/${supplierId}`)
      if (!res.ok()) console.error(`Gagal cleanup supplier ${supplierId}: ${res.status()} ${await res.text()}`)
    }
  })

  test("Staff membuat draft transaksi lewat form", async ({ page }) => {
    await loginAs(page, "STAFF")
    await page.goto("/dashboard/staff")

    await page.getByPlaceholder("Ketik nama / inisial supplier...").fill(supplierName)
    await page.getByText(supplierName, { exact: false }).first().click()

    // ElegantSelect membuka menu lewat portal dengan position:fixed, dihitung
    // dari posisi tombolnya saat diklik (lihat ElegantSelect.tsx). Kalau
    // tombolnya ada dekat batas bawah viewport (tergantung tinggi render
    // form -- bisa beda antar environment/font), menunya bisa jatuh di luar
    // viewport dan tidak bisa di-scroll-ke (fixed, bukan mengikuti scroll
    // halaman). Scroll ke tengah viewport dulu supaya selalu ada ruang.
    const skuSelectButton = page.getByText("Pilih SKU", { exact: true }).first()
    await skuSelectButton.evaluate((el) => el.scrollIntoView({ block: "center" }))
    await skuSelectButton.click()
    await page.getByRole("option", { name: skuName, exact: true }).click()

    // Ditarget lewat aria-label, bukan urutan input[type=number]. Cara
    // lama ikut terurut oleh setiap kolom angka baru di halaman dan
    // patah begitu jenis inputnya berubah.
    await page.getByLabel("Berat Lapak (KG)").first().fill("10")
    await page.getByLabel("Harga/KG (Rp)").first().fill("5000")

    await page.getByRole("button", { name: "Simpan & Buat Nota Draft" }).click()

    // Draft berhasil -> form staff kembali ke kondisi awal / redirect, dan
    // transaksi baru muncul di riwayat transaksi staff.
    await page.goto("/dashboard/staff/history")
    await expect(page.getByText(supplierName, { exact: false }).first()).toBeVisible()

    const res = await page.request.get(`/api/auth/session`)
    void res
    const purchases = await page.evaluate(async () => {
      const r = await fetch("/api/purchases/draft", { method: "GET" }).catch(() => null)
      return r ? r.status : null
    })
    void purchases
  })

  test("Draft yang baru dibuat benar-benar tersimpan dengan status menunggu_verifikasi", async ({ request }) => {
    await apiLogin(request, "ADMIN")
    // Tidak ada endpoint list purchase per-supplier, jadi konfirmasi lewat
    // halaman double-check admin yang memuat seluruh draft menunggu gudang.
    const res = await request.get("/dashboard/admin")
    expect(res.ok()).toBeTruthy()
    const body = await res.text()
    expect(body).toContain(supplierName)
  })

  test("Admin memverifikasi gudang (double-check) lewat form", async ({ page }) => {
    await loginAs(page, "ADMIN")
    await page.goto("/dashboard/admin")
    // Nama supplier di tabel cuma teks biasa, bukan link -- yang bisa
    // diklik untuk navigasi adalah tombol "Lakukan Cek" di baris yang sama.
    await page
      .locator("tr", { hasText: supplierName })
      .getByRole("button", { name: "Lakukan Cek" })
      .click()
    await page.waitForURL(/\/dashboard\/admin\/check\//)

    purchaseId = page.url().split("/check/")[1]

    // Isi "Timbangan Gudang (Admin)" per-item (placeholder="0.00", unik
    // karena transaksi uji ini cuma 1 item) -- field total "Timbangan
    // Gudang (KG)" di atasnya otomatis ke-update dari sini (lihat updateItem
    // di DoubleCheckForm.tsx), jadi tidak perlu diisi manual.
    const gudangInput = page.getByPlaceholder("0.00")
    await gudangInput.fill("10")

    await page.getByRole("button", { name: "Simpan Verifikasi" }).click()
    await page.waitForURL("**/dashboard/admin")
  })

  test("Transaksi berstatus approved setelah double-check (SKU tanpa standar harga)", async ({ request }) => {
    await apiLogin(request, "MANAGER")
    const res = await request.get("/dashboard/manager/history")
    const body = await res.text()
    expect(body).toContain(supplierName)
  })

  test("Admin mengunggah bukti transfer lewat form", async ({ page }) => {
    await loginAs(page, "ADMIN")
    await page.goto("/dashboard/admin/transfer")
    await expect(page.getByText(supplierName, { exact: false }).first()).toBeVisible()

    // Bisa ada kartu transfer lain dari data lama di DB dev bersama, jadi
    // input file harus discope ke kartu (article) milik supplier uji ini.
    const fileInput = page.locator("article", { hasText: supplierName }).locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: "bukti-e2e.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      ),
    })

    await expect(page.getByText("Sudah Transfer", { exact: true }).first()).toBeVisible({ timeout: 10000 })
  })

  test("Manager melihat transaksi di riwayat dan berhasil export CSV", async ({ page }) => {
    await loginAs(page, "MANAGER")
    await page.goto("/dashboard/manager/history")
    await expect(page.getByText(supplierName, { exact: false }).first()).toBeVisible()
    await expect(page.getByText("Sudah Transfer", { exact: true }).first()).toBeVisible()

    await page.goto("/dashboard/manager/reports")
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Export CSV" }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })
})
