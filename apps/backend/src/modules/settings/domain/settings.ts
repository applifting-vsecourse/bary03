import { QuackMood } from '@/modules/quack/domain/quack';

export type UserSettings = {
  username: string;
  name: string;
  bio: string | null;
  defaultMood: QuackMood | null;
};

export class UsernameTakenError extends Error {
  constructor(username: string) {
    super(`Username ${username} is already taken`);
  }
}
