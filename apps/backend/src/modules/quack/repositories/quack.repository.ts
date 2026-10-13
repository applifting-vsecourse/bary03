import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  PollOption as PrismaPollOption,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Quack, QuackMood, QuackPoll } from '@/modules/quack/domain/quack';
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

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & {
    user?: PrismaUser;
    pollOptions?: PrismaPollOptionWithCount[];
    pollVotes?: { optionId: string }[];
  },
): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        // the spelling the user chose; `username` is BetterAuth's lowercased copy
        username: quack.user.displayUsername ?? quack.user.username ?? '',
      }
    : undefined,
  poll: mapPrismaPollToDomain(quack.pollOptions, quack.pollVotes),
});

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
   * Polls say which answer `viewerId` picked.
   */
  async getQuacks(viewerId: string, search?: string): Promise<Quack[]> {
    const contains = search
      ? { contains: escapeLikePattern(search), mode: 'insensitive' as const }
      : undefined;
    const quacks = await this.prisma.$transaction(
      (tx) =>
        tx.quack.findMany({
          where: contains
            ? {
                OR: [
                  { text: contains },
                  { user: { name: contains } },
                  { user: { username: contains } },
                ],
              }
            : undefined,
          include: { user: true, ...pollInclude(viewerId) },
          orderBy: { createdAt: 'desc' },
        }),
      consistentRead,
    );
    return quacks.map(mapPrismaQuackToDomain);
  }

  async createQuack(createQuackData: {
    text: string;
    mood: QuackMood | null;
    userId: string;
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
      },
      include: { user: true, ...pollInclude(createQuackData.userId) },
    });
    return mapPrismaQuackToDomain(quack);
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
   */
  async setVote(vote: {
    quackId: string;
    userId: string;
    optionId: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "poll_vote" ("quackId", "userId", "optionId")
      VALUES (${vote.quackId}, ${vote.userId}, ${vote.optionId})
      ON CONFLICT ("quackId", "userId") DO UPDATE
        SET "optionId" = EXCLUDED."optionId", "updatedAt" = now()
        WHERE "poll_vote"."optionId" <> EXCLUDED."optionId"
    `;
  }
}
