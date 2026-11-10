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
  /** null only on a placeholder: a deleted quack kept for its replies. */
  text: string | null;
  mood: QuackMood | null;
  /** null only on a placeholder: it keeps nothing about its author. */
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  /** null when the quack is not a poll. */
  poll: QuackPoll | null;
  /** Counted from the reply rows on every read, never stored. */
  replyCount: number;
};

/** A quack posted under another quack. Replies go one level deep and are text only. */
export type Reply = {
  id: string;
  text: string;
  /** The quack this reply answers. */
  parentId: string;
  userId: string;
  createdAt: Date;
  user: QuackAuthor;
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

/** The quack being replied to is itself a reply; replies go one level deep. */
export class CannotReplyToReplyError extends Error {
  constructor(quackId: string) {
    super(`Quack ${quackId} is a reply and can't be replied to`);
  }
}

/** The quack was deleted and is only kept for its replies, so it takes no new ones. */
export class QuackDeletedError extends Error {
  constructor(quackId: string) {
    super(`Quack ${quackId} was deleted`);
  }
}

/**
 * The quack has replies, so it can't be deleted outright. Until deleting
 * wipes such a quack instead (story.md, docs/adr/0001), the delete is refused.
 */
export class QuackHasRepliesError extends Error {
  constructor(quackId: string) {
    super(`Quack ${quackId} has replies`);
  }
}
