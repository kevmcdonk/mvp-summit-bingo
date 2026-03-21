'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn('azure-ad')}
      className="bg-white text-blue-900 font-semibold px-8 py-4 rounded-lg text-lg hover:bg-blue-100 transition-colors focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-900"
      aria-label="Sign in with Microsoft"
    >
      Sign in with Microsoft
    </button>
  );
}
