export interface Phrase {
  id: string;
  text: string;
  isActive: boolean;
  category: string | null;
  inPersonOnly?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  isInPerson?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BingoCard {
  id: string;
  userId: string;
  phrases: string[]; // 25 phrase ids in board order
  generatedAt: string;
}

export interface BingoProgress {
  id: string;
  userId: string;
  cardId: string;
  markedIndexes: number[]; // 0-24
  phraseCounts?: Record<string, number>; // phraseId → number of times clicked
  linesCompleted: number;
  hasHouse: boolean;
  hasBingo: boolean;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  eventType: 'MARK' | 'UNMARK' | 'HOUSE' | 'BINGO';
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CardWithProgress {
  card: BingoCard;
  progress: BingoProgress;
  phrases: Phrase[];
}

export interface UserStatusSummary {
  userId: string;
  email: string;
  displayName: string;
  markedCount: number;
  linesCompleted: number;
  hasHouse: boolean;
  hasBingo: boolean;
  lastActivity: string;
}
