import NextAuth, { type NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compareSync } from 'bcrypt-ts-edge';

import { prisma } from '@/db/prisma';
import { signInFormSchema } from '@/lib/validator';

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
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (credentials == null) return null;

        const parsed = signInFormSchema.safeParse(credentials);
        if (!parsed.success) return null;

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
