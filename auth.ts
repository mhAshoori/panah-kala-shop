import NextAuth, { type NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { CredentialsSignin } from '@auth/core/errors';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compareSync } from 'bcrypt-ts-edge';

import { prisma } from '@/db/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { normalizeIranMobile } from '@/lib/phone';
import { signInFormSchema } from '@/lib/validator';

// Mock SMS master code — always valid for testing (see README)
export const MOCK_OTP_CODE = '123456';
export const OTP_TTL_MS = 5 * 60 * 1000;

// Typed sign-in errors — the client reads `.code` to show the right message
class SmsUserNotFound extends CredentialsSignin {
  code = 'user_not_found';
}
class SmsRateLimited extends CredentialsSignin {
  code = 'rate_limited';
}

// Validate an SMS one-time code against VerificationToken or the mock master
async function verifySmsOtp(phone: string, code: string): Promise<boolean> {
  if (code === MOCK_OTP_CODE) return true;

  const token = await prisma.verificationToken.findFirst({
    where: { identifier: `otp:${phone}`, token: code, expires: { gt: new Date() } },
  });
  return !!token;
}

export const config: NextAuthConfig = {
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: 'credentials',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (credentials == null) return null;

        const parsed = signInFormSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Brute-force guard: 5 attempts / 5 minutes per email
        const rl = rateLimit(
          `signin:${parsed.data.email.toLowerCase()}`,
          5,
          5 * 60 * 1000
        );
        if (!rl.allowed) return null;

        const user = await prisma.user.findFirst({
          where: { email: parsed.data.email },
        });
        if (!user?.password) return null;

        const isMatch = compareSync(parsed.data.password, user.password);
        if (!isMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    // SMS one-time-code sign-in (mock: code 123456 always works in dev)
    CredentialsProvider({
      id: 'sms',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        if (credentials == null) return null;

        // Normalize to +989XXXXXXXXX (accepts 09…, 9…, +989…, 00989…)
        const phone = normalizeIranMobile(String(credentials.phone ?? ''));
        const code = String(credentials.code ?? '').trim();
        if (!phone || !/^\d{4,6}$/.test(code)) {
          return null;
        }

        // Brute-force guard: 5 attempts / 5 minutes per phone
        const rl = rateLimit(`sms:${phone}`, 5, 5 * 60 * 1000);
        if (!rl.allowed) throw new SmsRateLimited();

        const valid = await verifySmsOtp(phone, code);
        if (!valid) return null;

        const user = await prisma.user.findFirst({ where: { mobile: phone } });
        if (!user) throw new SmsUserNotFound();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token, trigger }) {
      session.user.id = token.sub as string;
      if (token.name) session.user.name = token.name as string;
      if (token.role) session.user.role = token.role as string;
      if (trigger === 'update' && token.name) {
        session.user.name = token.name as string;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        if (user.name === 'NO_NAME' && user.email) {
          token.name = user.email.split('@')[0];
          await prisma.user.update({
            where: { id: user.id as string },
            data: { name: token.name },
          });
        }
      }
      if (session?.user?.name && trigger === 'update') {
        token.name = session.user.name;
      }
      return token;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
