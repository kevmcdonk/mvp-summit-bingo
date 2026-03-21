'use client';

interface WinBannerProps {
  type: 'house' | 'bingo';
  visible: boolean;
}

export default function WinBanner({ type, visible }: WinBannerProps) {
  if (!visible) return null;

  if (type === 'bingo') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div className="animate-bounce text-center px-8 py-10 rounded-3xl bg-gradient-to-br from-purple-600 via-pink-500 to-yellow-400 shadow-2xl">
          <div
            className="text-8xl sm:text-9xl font-black text-white tracking-widest"
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.8), 0 0 80px rgba(255,100,0,0.6)' }}
          >
            BINGO!
          </div>
          <div className="mt-4 text-2xl sm:text-3xl font-bold text-white/90">
            <span aria-hidden="true">🎉</span> Full Card Complete! <span aria-hidden="true">🎉</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center py-6 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 animate-pulse shadow-lg"
    >
      <div
        className="text-5xl sm:text-6xl font-black text-white tracking-widest"
        style={{ textShadow: '0 0 20px rgba(255,255,255,0.6)' }}
      >
        HOUSE! <span aria-hidden="true">🏠</span>
      </div>
    </div>
  );
}
