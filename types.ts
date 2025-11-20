export enum GameState {
  MENU = 'MENU',
  CHARACTER_SELECT = 'CHARACTER_SELECT',
  PLAYING = 'PLAYING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'rail';
}

export interface Spike {
  x: number;
  y: number;
  width: number;
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
  id: number;
}

export interface Character {
  id: string;
  name: string;
  color: string;
  speed: number;
  jumpForce: number;
  description: string;
}

export interface LevelData {
  id: number;
  platforms: Platform[];
  spikes: Spike[];
  coins: Coin[];
  finishLineX: number;
  theme: string;
}