#!/usr/bin/env node
/**
 * API route smoke test (Fase 7).
 *
 * Bukan unit test -- ini skenario HTTP nyata yang membutuhkan server yang
 * jalan dan Postgres yang terisi seed data (npm run seed). Data uji dibuat
 * sendiri (supplier throwaway) dan dibersihkan sendiri di akhir, sehingga
 * aman dijalankan berulang tanpa hardcode ID dari database siapa pun.
 *
 * Jalankan: npm run test:smoke
 * (server dev/production + docker compose db harus sudah menyala)
 */

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3000"
const CREDENTIALS = {
  MANAGER: { email: process.env.SMOKE_MANAGER_EMAIL || "manager@example.com", password: "password123" },
  ADMIN: { email: process.env.SMOKE_ADMIN_EMAIL || "admin.kediri@example.com", password: "password123" },
  STAFF: { email: process.env.SMOKE_STAFF_EMAIL || "staff.kediri@example.com", password: "password123" },
}

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail) {
  if (condition) {
    passed++
    console.log(`  ok - ${name}`)
  } else {
    failed++
    failures.push(name)
    console.log(`  FAIL - ${name}${detail ? ` (${detail})` : ""}`)
  }
}

/** Cookie jar sederhana: satu instance per sesi role. */
function createJar() {
  const cookies = new Map()
  return {
    apply(headers) {
      const setCookie = headers.getSetCookie ? headers.getSetCookie() : headers.raw?.()["set-cookie"] || []
      for (const raw of setCookie) {
        const [pair] = raw.split(";")
        const idx = pair.indexOf("=")
        cookies.set(pair.slice(0, idx), pair.slice(idx + 1))
      }
    },
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
    },
  }
}

async function req(jar, path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    redirect: "manual",
    headers: { ...(options.headers || {}), ...(jar ? { Cookie: jar.header() } : {}) },
  })
  if (jar) jar.apply(res.headers)
  return res
}

async function loginAs(role) {
  const jar = createJar()
  const { email, password } = CREDENTIALS[role]

  const csrfRes = await req(jar, "/api/auth/csrf")
  const { csrfToken } = await csrfRes.json()

  const loginRes = await req(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
  })

  const sessionRes = await req(jar, "/api/auth/session")
  const session = await sessionRes.json()

  if (!session?.user) {
    throw new Error(`Gagal login sebagai ${role} (status login: ${loginRes.status}). Cek kredensial seed atau server tidak menyala.`)
  }
  return { jar, session: session.user }
}

async function main() {
  console.log(`Smoke test API terhadap ${BASE_URL}\n`)

  console.log("1. Health check")
  const health = await req(null, "/api/health")
  check("GET /api/health -> 200", health.status === 200)
  const healthBody = await health.json().catch(() => ({}))
  check("health body melaporkan db up", healthBody.db === "up", JSON.stringify(healthBody))

  console.log("\n2. Akses tanpa sesi ditolak (regresi Fase 5)")
  check(
    "GET /api/targets tanpa auth -> 401",
    (await req(null, "/api/targets")).status === 401
  )
  check(
    "POST /api/purchases/draft tanpa auth -> 401",
    (await req(null, "/api/purchases/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status === 401
  )
  check(
    "POST /api/dp tanpa auth -> 401",
    (await req(null, "/api/dp", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status === 401
  )

  console.log("\n3. Login setiap role")
  const staff = await loginAs("STAFF")
  check("login STAFF berhasil, role sesuai", staff.session.role === "STAFF")
  const admin = await loginAs("ADMIN")
  check("login ADMIN berhasil, role sesuai", admin.session.role === "ADMIN")
  const manager = await loginAs("MANAGER")
  check("login MANAGER berhasil, role sesuai", manager.session.role === "MANAGER")

  console.log("\n4. Kontrol peran (bukan sekadar login berhasil)")
  check(
    "POST /api/dp sebagai MANAGER -> 401 (Manager tidak mengajukan kasbon, FR-5.1)",
    (await req(manager.jar, "/api/dp", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status === 401
  )
  check(
    "PUT double-check sebagai STAFF -> 401 (hanya ADMIN)",
    (await req(staff.jar, "/api/purchases/smoke-test-fake-id/double-check", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" })).status === 401
  )

  console.log("\n5. Siklus transaksi penuh: buat supplier -> draft -> double-check -> transfer")
  const stamp = Date.now()
  const supplierName = `Smoke Test Supplier ${stamp}`
  const skuName = `SmokeSKU-${stamp}` // sengaja tanpa standar harga -> lolos approval-harga otomatis

  const warehouseId = staff.session.warehouseId
  check("sesi STAFF memiliki warehouseId", !!warehouseId, "seed data staff harus ditugaskan ke gudang")

  const createSupplierRes = await req(staff.jar, "/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nama: supplierName, warehouseId, target_bulanan_kg: 100, frekuensi_ambilan_mingguan: 1 }),
  })
  check("POST /api/suppliers (throwaway) -> 201", createSupplierRes.status === 201, `status ${createSupplierRes.status}`)
  const supplier = await createSupplierRes.json()
  const supplierId = supplier.id

  let purchaseId = null
  if (supplierId) {
    const draftRes = await req(staff.jar, "/api/purchases/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        metode_pembayaran_terpilih: "TIMBANGAN_GUDANG",
        jenis_pengambilan: "AMBIL",
        items: [{ sku_name: skuName, spec: "Grading", berat_estimasi: 10, harga_per_kg: 5000 }],
        potongan_sampah: 0, berat_potongan_sampah: 0, harga_potongan_sampah: 0,
        potongan_susut: 0, berat_potongan_susut: 0, harga_potongan_susut: 0,
        potongan_air: 0, berat_potongan_air: 0, harga_potongan_air: 0,
        potongan_karung: 0, berat_potongan_karung: 0, harga_potongan_karung: 0,
      }),
    })
    check("POST /api/purchases/draft -> 201", draftRes.status === 201, `status ${draftRes.status}`)
    const draft = await draftRes.json()
    purchaseId = draft.id
    check("draft berstatus menunggu_verifikasi", draft.status_approval === "menunggu_verifikasi")

    // Mode logistik wajib: draft tanpa jenis_pengambilan harus ditolak, kalau
    // tidak rekap efektivitas armada di dashboard Manager kembali berlubang.
    const draftTanpaJenisRes = await req(staff.jar, "/api/purchases/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        metode_pembayaran_terpilih: "TIMBANGAN_GUDANG",
        items: [{ sku_name: skuName, spec: "Grading", berat_estimasi: 10, harga_per_kg: 5000 }],
        potongan_sampah: 0, berat_potongan_sampah: 0, harga_potongan_sampah: 0,
        potongan_susut: 0, berat_potongan_susut: 0, harga_potongan_susut: 0,
        potongan_air: 0, berat_potongan_air: 0, harga_potongan_air: 0,
        potongan_karung: 0, berat_potongan_karung: 0, harga_potongan_karung: 0,
      }),
    })
    check(
      "draft tanpa jenis_pengambilan -> 400",
      draftTanpaJenisRes.status === 400,
      `status ${draftTanpaJenisRes.status}`
    )

    if (purchaseId) {
      const doubleCheckRes = await req(admin.jar, `/api/purchases/${purchaseId}/double-check`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          berat_timbangan_lapak: 10,
          berat_timbangan_gudang: 10,
          metode_pembayaran_terpilih: "TIMBANGAN_GUDANG",
          items: [{ sku_name: skuName, spec: "Grading", berat_lapak: 10, berat_final_item: 10, harga_per_kg: 5000 }],
          returs: [],
          dp_yang_digunakan: 0,
          potongan_sampah: 0, berat_potongan_sampah: 0, harga_potongan_sampah: 0,
          potongan_susut: 0, berat_potongan_susut: 0, harga_potongan_susut: 0,
          potongan_air: 0, berat_potongan_air: 0, harga_potongan_air: 0,
          potongan_karung: 0, berat_potongan_karung: 0, harga_potongan_karung: 0,
          persentase_pembayaran: 100,
          nominal_pembayaran_awal: 0,
          nominal_belum_lunas: 0,
          status_pelunasan: "LUNAS",
        }),
      })
      check("PUT double-check sebagai ADMIN -> 200", doubleCheckRes.status === 200, `status ${doubleCheckRes.status}`)
      const doubleChecked = await doubleCheckRes.json()
      check(
        "SKU tanpa standar harga -> langsung approved (kontrol harga tidak memblokir)",
        doubleChecked.status_approval === "approved",
        `status_approval: ${doubleChecked.status_approval}`
      )

      const form = new FormData()
      form.append("bukti", new Blob(["fake-image-bytes"], { type: "image/png" }), "bukti.png")
      const transferRes = await req(admin.jar, `/api/purchases/${purchaseId}/transfer`, { method: "POST", body: form })
      check("POST transfer dengan bukti -> 200", transferRes.status === 200, `status ${transferRes.status}`)
      const transferred = await transferRes.json().catch(() => ({}))
      check("status setelah transfer -> sudah_transfer", transferred.status_approval === "sudah_transfer")
    }
  }

  console.log("\n6. DP dikembalikan saat transaksi dihapus permanen (D-2 diperluas)")
  const dpSupplierName = `Smoke DP Supplier ${stamp}`
  const dpSkuName = `SmokeDP-SKU-${stamp}`
  const createDpSupplierRes = await req(staff.jar, "/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // confirmDuplicate: true -- nama ini berbagi stamp dengan supplier
    // section 5, bisa ke-flag "mirip" oleh deteksi duplikat (Levenshtein).
    body: JSON.stringify({ nama: dpSupplierName, warehouseId, target_bulanan_kg: 100, frekuensi_ambilan_mingguan: 1, confirmDuplicate: true }),
  })
  const dpSupplier = await createDpSupplierRes.json()
  const dpSupplierId = dpSupplier.id
  check("POST /api/suppliers (throwaway DP) -> 201", createDpSupplierRes.status === 201, `status ${createDpSupplierRes.status}`)

  let dpId = null
  let dpPurchaseId = null
  if (dpSupplierId) {
    const requestDpRes = await req(staff.jar, "/api/dp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: dpSupplierId, nominal_diajukan: 100000, keterangan: "smoke test D-2" }),
    })
    check("POST /api/dp -> 201", requestDpRes.status === 201, `status ${requestDpRes.status}`)
    const dp = await requestDpRes.json()
    dpId = dp.id

    // Kasbon kini SELALU diputus Manager (keputusan meeting), Admin tidak
    // lagi punya wewenang -- kedua sisi itu diuji di sini.
    const approveDpAsAdminRes = await req(admin.jar, `/api/dp/${dpId}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    })
    check(
      "PUT approve DP sebagai ADMIN -> 401 (kasbon hanya diputus Manager)",
      approveDpAsAdminRes.status === 401,
      `status ${approveDpAsAdminRes.status}`
    )

    const approveDpRes = await req(manager.jar, `/api/dp/${dpId}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    })
    check("PUT approve DP sebagai MANAGER -> 200", approveDpRes.status === 200, `status ${approveDpRes.status}`)

    const draftDpRes = await req(staff.jar, "/api/purchases/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: dpSupplierId,
        metode_pembayaran_terpilih: "TIMBANGAN_GUDANG",
        jenis_pengambilan: "KIRIM",
        dp_yang_digunakan: 50000,
        items: [{ sku_name: dpSkuName, spec: "Grading", berat_estimasi: 10, harga_per_kg: 5000 }],
        potongan_sampah: 0, berat_potongan_sampah: 0, harga_potongan_sampah: 0,
        potongan_susut: 0, berat_potongan_susut: 0, harga_potongan_susut: 0,
        potongan_air: 0, berat_potongan_air: 0, harga_potongan_air: 0,
        potongan_karung: 0, berat_potongan_karung: 0, harga_potongan_karung: 0,
      }),
    })
    check("POST draft dengan potongan kasbon -> 201", draftDpRes.status === 201, `status ${draftDpRes.status}`)
    const dpDraft = await draftDpRes.json()
    dpPurchaseId = dpDraft.id

    // Saldo kasbon harus sudah terpotong sejak nota dibuat Staff, bukan
    // menunggu verifikasi gudang.
    const summaryAfterDraft = await (await req(manager.jar, `/api/dp/summary?supplierId=${dpSupplierId}`)).json()
    const rowAfterDraft = summaryAfterDraft.find((s) => s.supplierId === dpSupplierId)
    check(
      "sisa DP langsung terpotong 50000 saat draft dibuat Staff",
      rowAfterDraft?.remaining === 50000,
      JSON.stringify(rowAfterDraft)
    )

    const dcDpRes = await req(admin.jar, `/api/purchases/${dpPurchaseId}/double-check`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        berat_timbangan_lapak: 10,
        berat_timbangan_gudang: 10,
        metode_pembayaran_terpilih: "TIMBANGAN_GUDANG",
        items: [{ sku_name: dpSkuName, spec: "Grading", berat_lapak: 10, berat_final_item: 10, harga_per_kg: 5000 }],
        returs: [],
        // Nominal kasbon sengaja TIDAK dikirim: nilainya sudah terkunci sejak
        // draft. Kalau server sampai memakai nilai dari sini, saldo lapak akan
        // terpotong dua kali.
        potongan_sampah: 0, berat_potongan_sampah: 0, harga_potongan_sampah: 0,
        potongan_susut: 0, berat_potongan_susut: 0, harga_potongan_susut: 0,
        potongan_air: 0, berat_potongan_air: 0, harga_potongan_air: 0,
        potongan_karung: 0, berat_potongan_karung: 0, harga_potongan_karung: 0,
        persentase_pembayaran: 100,
      }),
    })
    check("PUT double-check (kasbon read-only) -> 200", dcDpRes.status === 200, `status ${dcDpRes.status}`)

    const summaryBefore = await (await req(manager.jar, `/api/dp/summary?supplierId=${dpSupplierId}`)).json()
    const rowBefore = summaryBefore.find((s) => s.supplierId === dpSupplierId)
    check("sisa DP tetap 50000 setelah double-check (tidak dobel potong)", rowBefore?.remaining === 50000, JSON.stringify(rowBefore))

    const delDpPurchaseRes = await req(manager.jar, `/api/manager/purchases/${dpPurchaseId}`, { method: "DELETE" })
    check("DELETE transaksi (dengan DP terpakai) -> 200", delDpPurchaseRes.status === 200, `status ${delDpPurchaseRes.status}`)
    dpPurchaseId = null // sudah terhapus, jangan dihapus lagi di bagian cleanup

    const summaryAfter = await (await req(manager.jar, `/api/dp/summary?supplierId=${dpSupplierId}`)).json()
    const rowAfter = summaryAfter.find((s) => s.supplierId === dpSupplierId)
    check(
      "DP dikembalikan penuh (remaining 100000) setelah transaksi dihapus",
      rowAfter?.remaining === 100000 && rowAfter?.totalUsed === 0,
      JSON.stringify(rowAfter)
    )
  }

  console.log("\n7. Pendaftaran akun hanya oleh Manager")
  const akunStamp = Date.now()
  const akunBody = {
    nama: `Smoke User ${akunStamp}`,
    email: `smoke.user.${akunStamp}@example.com`,
    password: "password123",
    role: "STAFF",
    warehouseId,
  }
  check(
    "POST /api/users tanpa auth -> 401",
    (await req(null, "/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(akunBody) })).status === 401
  )
  check(
    "POST /api/users sebagai STAFF -> 401 (bukan wewenang Staff)",
    (await req(staff.jar, "/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(akunBody) })).status === 401
  )
  check(
    "POST /api/users sebagai ADMIN -> 401 (bukan wewenang Admin)",
    (await req(admin.jar, "/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(akunBody) })).status === 401
  )
  // Regresi eskalasi hak akses: Staff tidak boleh mengangkat dirinya Manager.
  check(
    "POST /api/users role MANAGER sebagai STAFF -> 401",
    (await req(staff.jar, "/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...akunBody, role: "MANAGER", warehouseId: null }) })).status === 401
  )

  const buatAkunRes = await req(manager.jar, "/api/users", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(akunBody),
  })
  check("POST /api/users sebagai MANAGER -> 201", buatAkunRes.status === 201, `status ${buatAkunRes.status}`)
  const akunBaru = await buatAkunRes.json().catch(() => ({}))
  check("akun baru tidak mengembalikan password", !("password" in akunBaru), JSON.stringify(Object.keys(akunBaru)))

  check(
    "POST /api/users email duplikat -> 409",
    (await req(manager.jar, "/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(akunBody) })).status === 409
  )
  check(
    "POST /api/users password < 8 karakter -> 400",
    (await req(manager.jar, "/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...akunBody, email: `x.${akunStamp}@example.com`, password: "short" }) })).status === 400
  )

  console.log("\n8. Bersih-bersih data uji")
  if (purchaseId) {
    const delPurchase = await req(manager.jar, `/api/manager/purchases/${purchaseId}`, { method: "DELETE" })
    check("DELETE transaksi uji -> 200", delPurchase.status === 200, `status ${delPurchase.status}`)
  }
  if (supplierId) {
    const delSupplier = await req(manager.jar, `/api/manager/suppliers/${supplierId}`, { method: "DELETE" })
    check("DELETE supplier uji -> 200", delSupplier.status === 200, `status ${delSupplier.status}`)
  }
  if (dpPurchaseId) {
    await req(manager.jar, `/api/manager/purchases/${dpPurchaseId}`, { method: "DELETE" })
  }
  if (dpId) {
    // Tidak ada endpoint DELETE untuk DownPayment (riwayat kasbon memang
    // dipertahankan) -- baris DP uji dihapus langsung lewat Prisma di sini
    // supaya supplier throwaway di bawah tetap bisa dibersihkan.
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()
    await prisma.downPayment.delete({ where: { id: dpId } }).catch(() => {})
    await prisma.$disconnect()
  }

  if (dpSupplierId) {
    const delDpSupplier = await req(manager.jar, `/api/manager/suppliers/${dpSupplierId}`, { method: "DELETE" })
    check("DELETE supplier DP uji -> 200", delDpSupplier.status === 200, `status ${delDpSupplier.status}`)
  }

  if (akunBaru?.id) {
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()
    try {
      await prisma.auditLog.deleteMany({ where: { record_id: akunBaru.id } })
      await prisma.user.delete({ where: { id: akunBaru.id } })
      check("hapus akun uji -> ok", true)
    } catch (e) {
      check("hapus akun uji -> ok", false, e.message)
    } finally {
      await prisma.$disconnect()
    }
  }

  console.log(`\n${passed} lolos, ${failed} gagal.`)
  if (failed > 0) {
    console.log("Gagal pada:", failures.join(", "))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Smoke test berhenti karena error tak terduga:", err)
  process.exit(1)
})
