import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "@auth/core/errors";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, verifyTurnstileToken } from "@/lib/turnstile";

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  turnstileToken: z.string().min(1),
});

// authorize() 里区分出具体的失败原因，通过 code 带回客户端，
// 避免"人机验证失败"和"用户名或密码错误"在页面上被误报成同一句话。
class CaptchaFailed extends CredentialsSignin {
  code = "captcha_failed";
}
class InvalidCredentials extends CredentialsSignin {
  code = "invalid_credentials";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  // Credentials provider 只支持 JWT session（用户不经过 adapter 持久化到 Session 表），
  // Google OAuth 的用户/账号数据仍然通过上面的 PrismaAdapter 落库，不受影响。
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password, turnstileToken } = parsed.data;

        const captchaOk = await verifyTurnstileToken(turnstileToken, getClientIp(request));
        if (!captchaOk) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email ?? undefined };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
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
