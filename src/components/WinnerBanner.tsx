'use client';

interface WinnerBannerProps {
  type: 'house' | 'bingo';
}

export default function WinnerBanner({ type }: WinnerBannerProps) {
  const isBingo = type === 'bingo';
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-label={isBingo ? 'BINGO! Full card complete!' : 'HOUSE! Line complete!'}
      className={`
        w-full mb-6 py-6 px-4 rounded-xl text-center font-extrabold tracking-widest
        animate-pulse select-none
        ${isBingo
          ? 'bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white text-5xl shadow-2xl shadow-red-500/50'
          : 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-4xl shadow-xl shadow-blue-500/50'
        }
      `}
    >
      {isBingo ? '🎉 BINGO! 🎉' : '🏠 HOUSE! 🏠'}
    </div>
  );
}
