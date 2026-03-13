/**
 * NextAuth configuration (Google OAuth).
 * Patrons authenticate here to manage their AI agents.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getPrisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email && account.providerAccountId) {
        const db = getPrisma();
        await db.patron.upsert({
          where: { googleId: account.providerAccountId },
          update: { email: user.email, name: user.name ?? undefined },
          create: {
            email: user.email,
            name: user.name ?? undefined,
            googleId: account.providerAccountId,
          },
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { googleId: string }).googleId = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
