import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { getErrorMessage } from "@/lib/errors"

/** Role yang boleh dibuat lewat endpoint ini. */
const ROLE_DIIZINKAN = ["STAFF", "ADMIN", "MANAGER"] as const

/**
 * Pendaftaran akun.
 *
 * SENGAJA hanya bisa diakses Manager, bukan pendaftaran mandiri terbuka.
 * Endpoint ini menerima `role` dari pengirim; kalau dibuka untuk publik,
 * siapa pun bisa mendaftar sambil memilih role MANAGER untuk dirinya
 * sendiri dan langsung memegang seluruh kewenangan approval. Penambahan
 * akun operasional memang pekerjaan Manager, jadi pembatasan ini tidak
 * mengurangi fungsinya.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { nama, email, password, role, warehouseId } = await req.json()

    if (!nama?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Nama, email, dan password wajib diisi." }, { status: 400 })
    }

    const emailBersih = String(email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBersih)) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 })
    }

    if (String(password).length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 })
    }

    if (!ROLE_DIIZINKAN.includes(role)) {
      return NextResponse.json({ error: "Role harus STAFF, ADMIN, atau MANAGER." }, { status: 400 })
    }

    // Staff dan Admin bekerja pada satu gudang; tanpa gudang, sesi mereka
    // tidak punya warehouseId dan hampir semua alurnya langsung gagal.
    if (role !== "MANAGER" && !warehouseId) {
      return NextResponse.json({ error: "Staff dan Admin wajib ditugaskan ke satu gudang." }, { status: 400 })
    }

    if (warehouseId) {
      const gudang = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
      if (!gudang) {
        return NextResponse.json({ error: "Gudang tidak ditemukan." }, { status: 400 })
      }
    }

    const sudahAda = await prisma.user.findUnique({ where: { email: emailBersih } })
    if (sudahAda) {
      return NextResponse.json({ error: "Email ini sudah terdaftar." }, { status: 409 })
    }

    const hashed = await bcrypt.hash(String(password), 10)
    const user = await prisma.user.create({
      data: {
        nama: String(nama).trim(),
        email: emailBersih,
        password: hashed,
        role,
        warehouseId: role === "MANAGER" ? null : warehouseId,
      },
      select: { id: true, nama: true, email: true, role: true, warehouseId: true },
    })

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE_USER",
      table_name: "User",
      record_id: user.id,
      // Password TIDAK ikut dicatat, bahkan bentuk hash-nya.
      new_data: user,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error("Error creating user:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
