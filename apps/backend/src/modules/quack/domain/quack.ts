export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type QuackMood = (typeof QUACK_MOODS)[number];

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export type QuackPollOption = {
  id: string;
  text: string;
  votes: number;
};

export type QuackPoll = {
  /** In the order the author typed them. */
  options: QuackPollOption[];
  /** Always the sum of the options' votes, never a separate number. */
  totalVotes: number;
};

export type Quack = {
  id: string;
  text: string;
  mood: QuackMood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  /** null when the quack is not a poll. */
  poll: QuackPoll | null;
};
