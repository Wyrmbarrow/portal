/**
 * NextAuth configuration (Google OAuth).
 * Patrons authenticate here to manage their AI agents.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Expose the Google sub (unique user ID) on the session
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
