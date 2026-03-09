import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createActivityLog } from "@/lib/activity-log"
import type { Role } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role?: Role
    cbu?: number
  }
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role?: Role
      /** Member's Capital Build Up (savings), set when role is MEMBER */
      cbu?: number
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role
    id?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.password !== "string") {
          return null
        }
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            passwordHash: true,
            status: true,
          },
        })
        if (!user?.passwordHash || user.status === "INACTIVE") return null
        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )
        if (!valid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user?.id) {
        createActivityLog({
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          details: user.email ?? undefined,
        }).catch(() => {})
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub!
        session.user.role = token.role
        if (token.role === "MEMBER" && token.id) {
          const member = await prisma.member.findUnique({
            where: { userId: token.id },
            select: { cbu: true },
          })
          session.user.cbu = member?.cbu ?? undefined
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
})
