import NextAuth, { type NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { CredentialsSignin } from '@auth/core/errors';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compareSync } from 'bcrypt-ts-edge';

import { prisma } from '@/db/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { normalizeIranMobile } from '@/lib/phone';
import { isSmsConfigured } from '@/lib/sms/smsir';
import { signInFormSchema } from '@/lib/validator';
import { mergeGuestCartOnSignIn } from '@/lib/cart/merge';
import { cookies } from 'next/headers';

// OTP TTL shared with the request path (lib/otp.ts re-exports for actions)
export const OTP_TTL_MS = 5 * 60 * 1000;

// Typed sign-in errors — the client reads `.code` to show the right message
class SmsUserNotFound extends CredentialsSignin {
  code = 'user_not_found';
}
class SmsRateLimited extends CredentialsSignin {
  code = 'rate_limited';
}

// Validate an SMS one-time code against VerificationToken. Without SMS.ir
// configured (dev/CI only) the fixed master code 123456 keeps the flow
// testable; with the key set, ONLY the code actually sent is accepted.
async function verifySmsOtp(phone: string, code: string): Promise<boolean> {
  if (!isSmsConfigured() && code === '123456') return true;

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
    // Google OAuth — enabled only when credentials are configured so local
    // dev and CI keep working without a Google Cloud project.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
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
    // SMS one-time-code sign-in (SMS.ir when configured; fixed 123456 in dev)
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
      if (token.image) session.user.image = token.image as string;
      if (trigger === 'update' && token.name) {
        session.user.name = token.name as string;
      }
      if (trigger === 'update' && token.image !== undefined) {
        session.user.image = token.image as string;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // OAuth users (Google) come from the adapter without a role — look
        // it up in the DB so the JWT always carries the authoritative role.
        const dbRole = (user as { role?: string }).role;
        if (dbRole) {
          token.role = dbRole;
        } else if (user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          token.role = dbUser?.role ?? 'user';
        }

        if (user.name === 'NO_NAME' && user.email) {
          token.name = user.email.split('@')[0];
          await prisma.user.update({
            where: { id: user.id as string },
            data: { name: token.name },
          });
        }

        // Merge the guest cart (sessionCartId cookie) into the user's cart
        // on every sign-in/sign-up. Failures must never block sign-in.
        if (trigger === 'signIn' || trigger === 'signUp') {
          try {
            const cookiesObject = await cookies();
            const sessionCartId = cookiesObject.get('sessionCartId')?.value;
            if (user.id && sessionCartId) {
              await mergeGuestCartOnSignIn(
                user.id as string,
                sessionCartId
              );
            }
          } catch (error) {
            console.error('[cart-merge] failed:', error);
          }
        }
      }
      if (session?.user?.name && trigger === 'update') {
        token.name = session.user.name;
      }
      if (trigger === 'update') {
        // Pick up avatar changes (set or cleared) from the client's update()
        const clientImage = (session as { user?: { image?: string | null } })
          ?.user?.image;
        if (clientImage !== undefined) token.image = clientImage;
      }
      if (!token.image && token.sub && trigger !== 'update') {
        // Initial sign-in: the adapter's user object may not carry image for
        // credentials logins — read it once from the DB.
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { image: true },
          });
          if (dbUser?.image) token.image = dbUser.image;
        } catch {
          // DB hiccup must not break sign-in
        }
      }
      return token;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
