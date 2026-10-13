import { PrismaService } from '@/core/prisma/prisma.service';
import {
  PollOption as PrismaPollOption,
  Quack as PrismaQuack,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Quack, QuackMood, QuackPoll } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

// Counts come from the vote rows on every read (a COUNT subquery in the same
// statement as the answers), so they can't drift from the actual votes.
const pollInclude = {
  pollOptions: {
    orderBy: { position: 'asc' },
    include: { _count: { select: { votes: true } } },
  },
} as const;

type PrismaPollOptionWithCount = PrismaPollOption & {
  _count: { votes: number };
};

const mapPrismaPollToDomain = (
  options: PrismaPollOptionWithCount[] | undefined,
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
  };
};

const mapPrismaQuackToDomain = (
  quack: PrismaQuack & {
    user?: PrismaUser;
    pollOptions?: PrismaPollOptionWithCount[];
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
  poll: mapPrismaPollToDomain(quack.pollOptions),
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
   */
  async getQuacks(search?: string): Promise<Quack[]> {
    const contains = search
      ? { contains: escapeLikePattern(search), mode: 'insensitive' as const }
      : undefined;
    const quacks = await this.prisma.quack.findMany({
      where: contains
        ? {
            OR: [
              { text: contains },
              { user: { name: contains } },
              { user: { username: contains } },
            ],
          }
        : undefined,
      include: { user: true, ...pollInclude },
      orderBy: { createdAt: 'desc' },
    });
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
      include: { user: true, ...pollInclude },
    });
    return mapPrismaQuackToDomain(quack);
  }
}
