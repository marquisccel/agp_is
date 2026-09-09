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
 * viewport-fit sengaja dibiarkan bawaan (auto), bukan cover. Dengan cover,
 * seluruh isi harus menghitung sendiri env(safe-area-inset-*) supaya tidak
 * tertutup poni dan garis home, dan itu perkara terpisah dari perbaikan tata
 * letak ini.
 */
export const viewport: Viewport = {
  themeColor: "#F5F7F4",
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
