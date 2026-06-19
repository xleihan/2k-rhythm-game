export interface Note {
  time: number;
  column: number;
  hit: boolean;
  missed: boolean;
}

export interface GameResult {
  score: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  greats: number;
  goods: number;
  misses: number;
  audioBlob?: Blob;
  beatmap?: Note[];
}

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Style = 'electronic' | 'rock' | 'pop' | 'hiphop' | 'jazz' | 'custom';
