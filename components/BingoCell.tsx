'use client';

import { Phrase } from '@/lib/types';

interface BingoCellProps {
  phrase: Phrase;
  index: number;
  marked: boolean;
  count: number;
  isWinningCell: boolean;
  onMark: (index: number) => void;
  onUnmark: (index: number) => void;
}

export default function BingoCell({ phrase, index, marked, count, isWinningCell, onMark, onUnmark }: BingoCellProps) {
  const handleClick = () => {
    onMark(index);
  };

  const handleUnmark = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onUnmark(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMark(index);
    }
  };

  const handleUnmarkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleUnmark(e);
    }
  };

  return (
    <div
      role="checkbox"
      aria-checked={marked}
      aria-label={`Bingo square: ${phrase.text}${marked ? `, marked ${count} time${count !== 1 ? 's' : ''}` : ''}${isWinningCell ? ', winning' : ''}`}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative flex items-center justify-center p-2 min-h-[80px] sm:min-h-[100px]
        border-2 rounded-lg cursor-pointer select-none transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-offset-1
        ${isWinningCell
          ? 'border-yellow-400 bg-yellow-100 shadow-lg shadow-yellow-300/50'
          : marked
          ? 'border-green-500 bg-green-100 shadow-md'
          : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
        }
      `}
    >
      {marked && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5">
          {count > 1 && (
            <span className="bg-green-600 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
              {count}
            </span>
          )}
          <button
            type="button"
            onClick={handleUnmark}
            onKeyDown={handleUnmarkKeyDown}
            tabIndex={0}
            aria-label={`Unmark ${phrase.text}`}
            className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      )}
      <span
        className={`text-center text-xs sm:text-sm font-medium leading-tight ${
          marked ? 'text-green-800' : 'text-gray-800'
        }`}
      >
        {phrase.text}
      </span>
    </div>
  );
}
