'use client';

interface WinBannerProps {
  type: 'house' | 'bingo';
  visible: boolean;
  onClose?: () => void;
}

export default function WinBanner({ type, visible, onClose }: WinBannerProps) {
  if (!visible) return null;

  if (type === 'bingo') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div className="relative animate-bounce-5 text-center px-8 py-10 rounded-3xl bg-gradient-to-br from-purple-600 via-pink-500 to-yellow-400 shadow-2xl">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bingo notification"
              className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-2xl font-bold text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
            >
              ×
            </button>
          )}
          <div className="win-banner-bingo-title text-8xl sm:text-9xl font-black text-white tracking-widest">
            BINGO!
          </div>
          <div className="mt-4 text-2xl sm:text-3xl font-bold text-white/90">
            <span aria-hidden="true">🎉</span> Full Card Complete! <span aria-hidden="true">🎉</span>
          </div>
          <div className="mt-6">
            <video
              src="/Kevin-Golf.mp4"
              autoPlay
              muted
              controls
              playsInline
              loop
              className="mx-auto rounded-2xl shadow-xl max-w-xs sm:max-w-sm w-full"
              aria-label="Kevin Golf celebration video"
            />
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
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close house notification"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-3 py-1 text-2xl font-bold text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
        >
          ×
        </button>
      )}
      <div className="win-banner-house-title text-5xl sm:text-6xl font-black text-white tracking-widest">
        HOUSE! <span aria-hidden="true">🏠</span>
      </div>
    </div>
  );
}
