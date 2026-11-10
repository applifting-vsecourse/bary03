import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  PollOption as PrismaPollOption,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import {
  Quack,
  QuackAuthor,
  QuackMood,
  QuackPoll,
  Reply,
} from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

// Counts come from the vote rows on every read (a COUNT subquery in the same
// statement as the answers), so they can't drift from the actual votes.
// `pollVotes` is only the viewer's own vote, if any: their answer.
const pollInclude = (viewerId: string) =>
  ({
    pollOptions: {
      orderBy: { position: 'asc' },
      include: { _count: { select: { votes: true } } },
    },
    pollVotes: { where: { userId: viewerId }, select: { optionId: true } },
  }) as const;

// Prisma loads the answers, their counts and the viewer's vote with separate
// statements. Repeatable read makes them all see the same moment, so "my
// answer" and the counts can't disagree when someone votes in between.
const consistentRead = {
  isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
};

// Counted from the reply rows in the same statement, like the poll counts.
const replyCountInclude = {
  _count: { select: { replies: true } },
} as const;

type PrismaPollOptionWithCount = PrismaPollOption & {
  _count: { votes: number };
};

const mapPrismaPollToDomain = (
  options: PrismaPollOptionWithCount[] | undefined,
  viewerVotes: { optionId: string }[] | undefined,
): QuackPoll | null => {
  if (!options?.length) return null;
  const pollOptions = options.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option._count.votes,
  }));
  return {
    options: pollOptions,
    totalVotes: pollOptions.reduce((sum, option) => sum + option.votes, 0),
    myOptionId: viewerVotes?.[0]?.optionId ?? null,
  };
};

const mapPrismaUserToAuthor = (user: PrismaUser): QuackAuthor => ({
  id: user.id,
  name: user.name,
  // the spelling the user chose; `username` is BetterAuth's lowercased copy
  username: user.displayUsername ?? user.username ?? '',
});

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & {
    user?: PrismaUser | null;
    pollOptions?: PrismaPollOptionWithCount[];
    pollVotes?: { optionId: string }[];
    _count?: { replies: number };
  },
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user ? mapPrismaUserToAuthor(quack.user) : undefined,
  poll: mapPrismaPollToDomain(quack.pollOptions, quack.pollVotes),
  replyCount: quack._count?.replies ?? 0,
});

/** The rows a reply is made of; the schema's CHECKs guarantee text and author. */
const mapPrismaReplyToDomain = (
  reply: PrismaQuack & { user: PrismaUser | null },
): Reply => {
  if (
    reply.parentId === null ||
    reply.text === null ||
    reply.userId === null ||
    reply.user === null
  ) {
    throw new Error(`Quack ${reply.id} is not a reply with text and author`);
  }
  return {
    id: reply.id,
    text: reply.text,
    parentId: reply.parentId,
    userId: reply.userId,
    createdAt: reply.createdAt,
    user: mapPrismaUserToAuthor(reply.user),
  };
};

/** What came of trying to post a reply under a quack. */
export type CreateReplyResult =
  | { status: 'created'; reply: Reply }
  | { status: 'parent-not-found' }
  | { status: 'parent-is-reply' }
  | { status: 'parent-deleted' };

/** What deleting a quack did: removed it, kept it as a placeholder, or found nothing to delete. */
export type DeleteQuackResult = 'deleted' | 'wiped' | 'not-found';

/** Locks the quack's row until the transaction ends; null when it doesn't exist. */
const lockForUpdate = async (
  tx: Prisma.TransactionClient,
  quackId: string,
): Promise<{ userId: string | null } | undefined> => {
  const [row] = await tx.$queryRaw<{ userId: string | null }[]>`
    SELECT "userId" FROM "quack" WHERE "id" = ${quackId} FOR UPDATE`;
  return row;
};

// Prisma passes `contains` straight into ILIKE without escaping, so % and _
// would act as wildcards. Postgres' default LIKE escape character is \.
const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * With a search, returns only quacks where the whole phrase appears, ignoring
   * case, in the text, the author's name or the author's username.
   * With an `authorId`, returns only that user's quacks.
   * Only top-level quacks: replies are never feed items.
   * Polls say which answer `viewerId` picked.
   */
  async getQuacks(
    viewerId: string,
    filter: { search?: string; authorId?: string } = {},
  ): Promise<Quack[]> {
    const { search, authorId } = filter;
    const contains = search
      ? { contains: escapeLikePattern(search), mode: 'insensitive' as const }
      : undefined;
    const quacks = await this.prisma.$transaction(
      (tx) =>
        tx.quack.findMany({
          where: {
            parentId: null,
            userId: authorId,
            OR: contains
              ? [
                  { text: contains },
                  { user: { name: contains } },
                  { user: { username: contains } },
                ]
              : undefined,
          },
          include: {
            user: true,
            ...pollInclude(viewerId),
            ...replyCountInclude,
          },
          orderBy: { createdAt: 'desc' },
        }),
      consistentRead,
    );
    return quacks.map(mapPrismaQuackToDomain);
  }

  /**
   * Creates the quack and, when `pollAnswers` isn't empty, its answers in the
   * given order. Prisma's nested create writes both in one transaction, so a
   * poll never exists without its answers.
   */
  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
    pollAnswers: string[];
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        pollOptions: {
          create: createQuackData.pollAnswers.map((text, position) => ({
            text,
            position,
          })),
        },
      },
      include: {
        user: true,
        ...pollInclude(createQuackData.userId),
        ...replyCountInclude,
      },
    });
    return mapPrismaQuackToDomain(quack);
  }

  /**
   * The quack's replies, oldest first (id breaks a tie, so the order never
   * shuffles between reads), or null when the quack doesn't exist. A reply
   * has no replies, so asking for a reply's gives an empty list.
   */
  async getReplies(quackId: string): Promise<Reply[] | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: {
        replies: {
          include: { user: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
    return quack ? quack.replies.map(mapPrismaReplyToDomain) : null;
  }

  /**
   * Posts a reply under `parentId`, if that quack exists, is not itself a
   * reply and has not been deleted. FOR SHARE locks the parent until the reply
   * is written: a delete or wipe of the parent waits for the reply, or the
   * reply waits for it and then sees the parent as it is afterwards. So a
   * reply never lands under a quack that is going away.
   */
  async createReply(replyData: {
    parentId: string;
    userId: string;
    text: string;
  }): Promise<CreateReplyResult> {
    return this.prisma.$transaction(async (tx) => {
      const [parent] = await tx.$queryRaw<
        { parentId: string | null; userId: string | null }[]
      >`SELECT "parentId", "userId" FROM "quack" WHERE "id" = ${replyData.parentId} FOR SHARE`;
      if (!parent) return { status: 'parent-not-found' };
      if (parent.parentId !== null) return { status: 'parent-is-reply' };
      if (parent.userId === null) return { status: 'parent-deleted' };

      const reply = await tx.quack.create({
        data: {
          text: replyData.text,
          user: { connect: { id: replyData.userId } },
          parent: { connect: { id: replyData.parentId } },
        },
        include: { user: true },
      });
      return { status: 'created', reply: mapPrismaReplyToDomain(reply) };
    });
  }

  /** Who wrote the quack, or null when it doesn't exist or is a placeholder. */
  async getQuackAuthorId(quackId: string): Promise<string | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true },
    });
    return quack?.userId ?? null;
  }

  /**
   * Deletes the quack only if `authorId` wrote it (for a moderator, the
   * author they were allowed to act on), as one transaction:
   *
   * - A quack without replies is deleted; its poll answers and votes go with
   *   it (cascade).
   * - A quack with replies is wiped instead (docs/adr/0001): its poll answers
   *   and votes are deleted and its text, mood and author erased. The row
   *   stays as a placeholder, so the replies keep their parent.
   * - A reply is deleted, and if that leaves its placeholder parent with no
   *   replies, the placeholder goes too.
   *
   * Locks run parent first, then the row, the same order a reply's creation
   * takes (FOR SHARE on its parent), so these can't deadlock each other.
   * Under the lock, the author check and the reply count can't be raced: a
   * reply being posted either finishes first and is counted, or waits and
   * then finds the quack wiped. Two last replies deleted at once take turns,
   * so the second still sees the placeholder empty.
   *
   * Returns 'not-found' when there is no such quack by that author, which
   * includes a placeholder (it has no author).
   */
  async deleteQuack(
    quackId: string,
    authorId: string,
  ): Promise<DeleteQuackResult> {
    return this.prisma.$transaction(async (tx) => {
      // parentId never changes, so it is safe to read before locking.
      const target = await tx.quack.findUnique({
        where: { id: quackId },
        select: { parentId: true },
      });
      if (!target) return 'not-found';
      if (target.parentId !== null) {
        await lockForUpdate(tx, target.parentId);
      }
      const locked = await lockForUpdate(tx, quackId);
      if (!locked || locked.userId !== authorId) return 'not-found';

      if (target.parentId !== null) {
        await tx.quack.delete({ where: { id: quackId } });
        await tx.quack.deleteMany({
          where: { id: target.parentId, userId: null, replies: { none: {} } },
        });
        return 'deleted';
      }

      const replyCount = await tx.quack.count({ where: { parentId: quackId } });
      if (replyCount === 0) {
        await tx.quack.delete({ where: { id: quackId } });
        return 'deleted';
      }
      // Votes go with their answers (cascade).
      await tx.pollOption.deleteMany({ where: { quackId } });
      // One statement on purpose: the quack_placeholder_shape CHECK sees each
      // statement's row, and Prisma runs a relation disconnect as a second
      // UPDATE, so text gone but author still set would be refused.
      await tx.$executeRaw`
        UPDATE "quack"
        SET "text" = NULL, "mood" = NULL, "userId" = NULL, "updatedAt" = now()
        WHERE "id" = ${quackId}`;
      return 'wiped';
    });
  }

  /** The ids of a poll's answers; empty when the quack doesn't exist or isn't a poll. */
  async getPollOptionIds(quackId: string): Promise<string[]> {
    const options = await this.prisma.pollOption.findMany({
      where: { quackId },
      select: { id: true },
    });
    return options.map((option) => option.id);
  }

  /** The poll as `viewerId` sees it, or null when the quack isn't a poll. */
  async getPoll(quackId: string, viewerId: string): Promise<QuackPoll | null> {
    const quack = await this.prisma.$transaction(
      (tx) =>
        tx.quack.findUnique({
          where: { id: quackId },
          include: pollInclude(viewerId),
        }),
      consistentRead,
    );
    return quack
      ? mapPrismaPollToDomain(quack.pollOptions, quack.pollVotes)
      : null;
  }

  /**
   * Sets the user's vote in one atomic statement. The primary key
   * (quackId, userId) means a second vote can only ever update the first, even
   * when two arrive at the same moment, so a person has at most one vote.
   * The (optionId, quackId) foreign key refuses an answer from another poll.
   *
   * My last click wins: a vote from the same tab (clientId) only replaces the
   * stored one when its click counter (clientSeq) is higher, so an older click
   * that arrives late is skipped. Postgres checks this under the row lock, as
   * part of the same statement, so nothing can slip in between. Tabs don't
   * share a counter, so a vote from another tab always replaces it.
   * Re-picking the same answer still records the newer counter.
   */
  async setVote(vote: {
    quackId: string;
    userId: string;
    optionId: string;
    clientId: string;
    clientSeq: number;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "poll_vote" ("quackId", "userId", "optionId", "clientId", "clientSeq")
      VALUES (${vote.quackId}, ${vote.userId}, ${vote.optionId}, ${vote.clientId}::uuid, ${vote.clientSeq})
      ON CONFLICT ("quackId", "userId") DO UPDATE
        SET "optionId" = EXCLUDED."optionId",
            "clientId" = EXCLUDED."clientId",
            "clientSeq" = EXCLUDED."clientSeq",
            "updatedAt" = now()
        WHERE "poll_vote"."clientId" <> EXCLUDED."clientId"
           OR "poll_vote"."clientSeq" < EXCLUDED."clientSeq"
    `;
  }
}
