import { getServerSession, NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.sub = account.providerAccountId || token.sub;
      }
      return token;
    },
  },
  pages: {
    signIn: '/',
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST || '';
  if (!allowlist.trim()) return false;
  return allowlist.split(',').map((e) => e.trim().toLowerCase()).includes(email.toLowerCase());
}
