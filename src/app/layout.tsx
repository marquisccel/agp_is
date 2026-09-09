import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from "@/components/providers/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AGP IS",
  description:
    "Sistem informasi pembelian PET lintas gudang PT Agrapana Greenworks Polymer.",
};

/*
 * Safari di iPhone mewarnai bilah alamat dan bilah bawahnya mengikuti
 * theme-color. Tanpa ini keduanya putih terang sementara halamannya berlatar
 * hijau pucat, sehingga ada dua garis putih menjepit layar dan aplikasinya
 * terbaca seperti halaman web di dalam peramban, bukan aplikasi.
 *
 * viewportFit "cover" membuat halaman mengisi sampai ke balik poni dan garis
 * home. Itu syarat supaya bilah navigasi bawah menempel benar-benar di tepi
 * layar seperti aplikasi, bukan mengambang di atas pita putih bawaan
 * peramban. Konsekuensinya env(safe-area-inset-*) wajib diperhitungkan;
 * nilainya sudah dijadikan token --aman-* di globals.css dan dipakai oleh
 * bilah bawah, bilah aksi, kepala halaman, serta bottom sheet.
 */
export const viewport: Viewport = {
  themeColor: "#F5F7F4",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
