import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { clearAttempts, isLockedOut, recordFailedAttempt } from "@/lib/loginThrottle"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        if (isLockedOut(credentials.email)) {
          throw new Error("Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.")
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        if (!user) {
          recordFailedAttempt(credentials.email)
          return null
        }
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          recordFailedAttempt(credentials.email)
          return null
        }
        clearAttempts(credentials.email)
        return { id: user.id, name: user.nama, email: user.email, role: user.role, warehouseId: user.warehouseId }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.warehouseId = user.warehouseId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
        session.user.id = token.id
        session.user.warehouseId = token.warehouseId
      }
      return session
    }
  },
  pages: { signIn: '/login' },
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
}
