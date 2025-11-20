import { Character } from './types';

export const GRAVITY = 0.6; // Lighter gravity for floatier, easier jumps
export const FRICTION = 0.94; // Standard friction
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const CHARACTERS: Character[] = [
  {
    id: 'balanced',
    name: 'Kai (Flow)',
    color: '#3b82f6', // Blue
    speed: 9, // Slightly reduced for control
    jumpForce: 16,
    description: 'The master of flow. Balanced stats.'
  },
  {
    id: 'speed',
    name: 'Luna (Blitz)',
    color: '#ef4444', // Red
    speed: 12, // Reduced from 14 so you don't fly off map
    jumpForce: 14,
    description: 'Speed demon. Harder to control air time.'
  },
  {
    id: 'jump',
    name: 'Zen (Aero)',
    color: '#10b981', // Green
    speed: 8,
    jumpForce: 19,
    description: 'Massive air time. Good for clearing huge gaps.'
  }
];

export const LEVEL_THEMES = [
  "Awakening",
  "Momentum",
  "The Gap",
  "Turbulence",
  "Grind",
  "Elevation",
  "Velocity",
  "Precision",
  "Nirvana",
  "God Mode"
];