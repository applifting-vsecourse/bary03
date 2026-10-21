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
  /** The answer the person viewing the poll picked, if any. */
  myOptionId: string | null;
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

/** The quack doesn't exist, or it isn't a poll. */
export class PollNotFoundError extends Error {
  constructor(quackId: string) {
    super(`Quack ${quackId} is not a poll`);
  }
}

/** The answer isn't one of this poll's answers. */
export class NotAPollOptionError extends Error {
  constructor(optionId: string, quackId: string) {
    super(`Option ${optionId} is not an answer of poll ${quackId}`);
  }
}

/** No quack has this id. */
export class QuackNotFoundError extends Error {
  constructor(quackId: string) {
    super(`Quack ${quackId} does not exist`);
  }
}

/** The role that may delete anyone's quack (see story.md: Moderation). */
export const MODERATOR_ROLE = 'admin';

/** Someone who is neither the author nor a moderator tried to change the quack. */
export class NotQuackAuthorError extends Error {
  constructor(quackId: string, userId: string) {
    super(`User ${userId} is not the author of quack ${quackId}`);
  }
}
