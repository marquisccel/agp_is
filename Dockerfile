# syntax=docker/dockerfile:1

# ---- deps: install dependencies only (cached separately from source changes) ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: generate Prisma client and build the Next.js app ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal runtime image using Next.js standalone output ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Skema + berkas migrasi dan Prisma CLI.
#
# Keluaran "standalone" hanya memuat berkas yang benar-benar di-import kode
# aplikasi, sehingga folder prisma/ dan CLI-nya TIDAK ikut terbawa. Tanpa
# bagian ini, `npx prisma migrate deploy` di dalam container gagal dengan
# "schema.prisma: file not found" -- padahal langkah itulah yang menyiapkan
# tabel database saat pemasangan pertama di server.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# bcryptjs dipakai skrip pembuatan akun Manager pertama (lihat
# docs/deploy-vps.md). Next mem-bundle paket ini ke dalam keluaran servernya,
# sehingga login tetap berfungsi tanpa baris ini -- tapi skrip `node -e`
# yang dijalankan manual tidak bisa me-resolve-nya.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Symlink bin-nya dibuat manual: COPY tidak membawa isi node_modules/.bin,
# sehingga tanpa baris ini `npx prisma` berhenti di "prisma: not found".
RUN mkdir -p node_modules/.bin     && ln -sf ../prisma/build/index.js node_modules/.bin/prisma     && chmod +x node_modules/prisma/build/index.js

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
