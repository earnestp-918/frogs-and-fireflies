
export enum GameState {
  ATTRACT = 'ATTRACT',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export enum GameMode {
  SOLO = 'SOLO',
  VS_AI = 'VS_AI',
  PVP = 'PVP'
}

export type FlyType = 'fly' | 'firefly' | 'dragonfly';

export interface Point {
  x: number;
  y: number;
}
