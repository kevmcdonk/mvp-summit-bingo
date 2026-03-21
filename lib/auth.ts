import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

function getAdminEmails(): string[] {
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST ?? '';
  return allowlist
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
      tenantId: process.env.AZURE_AD_TENANT_ID ?? '',
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.userId = (profile as Record<string, unknown>).oid as string ?? token.sub ?? '';
        token.email = profile.email ?? token.email ?? '';
        const adminEmails = getAdminEmails();
        const email = (token.email as string ?? '').toLowerCase();
        token.roles = adminEmails.includes(email) ? ['admin'] : [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.userId as string ?? token.sub ?? '';
        (session.user as Record<string, unknown>).roles = token.roles as string[] ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
};
