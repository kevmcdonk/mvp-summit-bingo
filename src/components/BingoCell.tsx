'use client';

interface BingoCellProps {
  index: number;
  text: string;
  marked: boolean;
  onToggle: (index: number, currentlyMarked: boolean) => void;
}

export default function BingoCell({ index, text, marked, onToggle }: BingoCellProps) {
  return (
    <button
      onClick={() => onToggle(index, marked)}
      aria-label={`${text}${marked ? ' (marked)' : ''}`}
      aria-pressed={marked}
      className={`
        aspect-square p-2 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all
        focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-950
        ${marked
          ? 'bg-yellow-400 border-yellow-300 text-gray-900 shadow-lg shadow-yellow-400/30 scale-95'
          : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:border-gray-600'
        }
      `}
    >
      {text}
    </button>
  );
}
