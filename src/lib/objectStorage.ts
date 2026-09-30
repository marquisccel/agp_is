import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

/**
 * Penyimpanan berkas bukti (bukti transfer, nota pelunasan).
 *
 * Kenapa tidak lagi menulis ke public/uploads:
 *
 * 1. Berkas di public/ dilayani Next secara STATIS, tanpa cek sesi sama
 *    sekali. Artinya siapa pun yang memegang URL-nya bisa membuka struk
 *    transfer bank -- lengkap dengan nomor rekening dan nominal -- tanpa
 *    perlu login. URL gampang bocor lewat riwayat browser, tangkapan layar,
 *    atau orang yang sudah tidak lagi bekerja di sana.
 * 2. Berkasnya ikut hilang setiap kali container di-redeploy, padahal ini
 *    bukti keuangan yang dipakai saat audit.
 *
 * Sekarang berkas diletakkan di Object Storage (S3-compatible) dan hanya
 * bisa dibaca lewat route berautentikasi /api/files/[...key].
 *
 * Kalau kredensial Object Storage TIDAK diisi (misal saat ngoding di laptop
 * atau saat CI jalan), otomatis jatuh ke penyimpanan lokal supaya alur
 * pengembangan tidak ikut terhambat. Yang berubah cuma tempat simpannya --
 * jalur akses tetap lewat route berautentikasi yang sama.
 */

const BUCKET = process.env.S3_BUCKET
const ENDPOINT = process.env.S3_ENDPOINT
const REGION = process.env.S3_REGION || "us-east-1"
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY

export function isObjectStorageConfigured(): boolean {
  return Boolean(BUCKET && ENDPOINT && ACCESS_KEY && SECRET_KEY)
}

let client: S3Client | null = null
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      // Wajib untuk penyedia S3-compatible non-AWS: tanpa ini SDK memakai
      // gaya virtual-host (bucket.endpoint) yang umumnya tidak didukung.
      forcePathStyle: true,
      credentials: {
        accessKeyId: ACCESS_KEY as string,
        secretAccessKey: SECRET_KEY as string,
      },
    })
  }
  return client
}

/** Folder fallback saat Object Storage belum dikonfigurasi (dev/CI). */
const LOCAL_DIR = path.join(process.cwd(), "storage", "uploads")

function localPath(key: string): string {
  // Cegah path traversal: key dipakai untuk menyusun path di disk.
  const aman = key.replace(/\\/g, "/").split("/").filter(bagian => bagian && bagian !== "." && bagian !== "..")
  return path.join(LOCAL_DIR, ...aman)
}

/**
 * Simpan berkas dan kembalikan KEY-nya (bukan URL publik).
 * Contoh key: "transfer-proofs/<purchaseId>-<timestamp>.jpg"
 */
export async function putFile(key: string, body: Buffer, contentType: string): Promise<string> {
  if (isObjectStorageConfigured()) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Bucket sengaja TIDAK dibuat public-read; berkas hanya dilayani
        // lewat route berautentikasi.
        ACL: "private",
      })
    )
    return key
  }

  if (process.env.VERCEL) {
    // Fallback lokal TIDAK bisa dipakai di Vercel: filesystem di luar /tmp
    // bersifat read-only, jadi mkdir di bawah akan gagal dengan ENOENT
    // mentah -- galat yang tidak menjelaskan apa-apa ke pengguna (Manager
    // hanya melihat "gagal upload" saat mencoba bayar lapak). Kegagalannya
    // digagalkan lebih awal dengan pesan yang bisa langsung ditindaklanjuti:
    // isi S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY di
    // Vercel untuk environment ini, lalu deploy ulang.
    throw new Error(
      "Penyimpanan berkas belum dikonfigurasi di server ini. Set S3_ENDPOINT, S3_BUCKET, " +
        "S3_ACCESS_KEY_ID, dan S3_SECRET_ACCESS_KEY di pengaturan Environment Variables Vercel " +
        "untuk environment ini, lalu deploy ulang."
    )
  }

  const tujuan = localPath(key)
  await mkdir(path.dirname(tujuan), { recursive: true })
  await writeFile(tujuan, body)
  return key
}

export type FileHasil = {
  body: Buffer
  contentType: string
}

/** Ambil berkas untuk dilayani route berautentikasi. */
export async function getFile(key: string): Promise<FileHasil | null> {
  if (isObjectStorageConfigured()) {
    try {
      const hasil = await getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
      if (!hasil.Body) return null
      const bytes = await hasil.Body.transformToByteArray()
      return {
        body: Buffer.from(bytes),
        contentType: hasil.ContentType || tebakContentType(key),
      }
    } catch {
      return null
    }
  }

  try {
    const body = await readFile(localPath(key))
    return { body, contentType: tebakContentType(key) }
  } catch {
    return null
  }
}

const TIPE_PER_EKSTENSI: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
}

function tebakContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? ""
  return TIPE_PER_EKSTENSI[ext] || "application/octet-stream"
}

/** Ubah key jadi jalur yang dipakai di <img src> / <a href>. */
export function fileUrl(key: string): string {
  return `/api/files/${key}`
}
