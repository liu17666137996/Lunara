import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    // 账号首次与 Google 关联时（注册或首次登录）触发一次，
    // account.providerAccountId 就是 Google 返回的用户 ID（profile.sub）。
    async linkAccount({ user, account }) {
      if (account.provider === "google") {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId: account.providerAccountId },
        });
      }
    },
  },
});
