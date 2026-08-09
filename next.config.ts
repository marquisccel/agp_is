import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Menghasilkan .next/standalone (server bundle minimal + node_modules
  // yang benar-benar dipakai) supaya image Docker runtime tidak perlu
  // menyalin seluruh node_modules dari tahap build.
  output: "standalone",
};

export default nextConfig;
