'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn('azure-ad', { callbackUrl: '/play' })}
      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-800 font-bold text-lg rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-400"
      aria-label="Sign in with Microsoft account"
    >
      <svg viewBox="0 0 23 23" className="w-6 h-6" aria-hidden="true">
        <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
        <path fill="#f35325" d="M1 1h10v10H1z"/>
        <path fill="#81bc06" d="M12 1h10v10H12z"/>
        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
        <path fill="#ffba08" d="M12 12h10v10H12z"/>
      </svg>
      Sign in with Microsoft
    </button>
  );
}
