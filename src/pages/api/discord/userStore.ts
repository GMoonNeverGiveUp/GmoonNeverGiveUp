import { atom } from 'nanostores';

export interface User {
  discordId: string;
  username: string;
  role: 'Spectator' | 'Galactic G' | 'Guardian';
}

export const userStore = atom<User | null>(null);
