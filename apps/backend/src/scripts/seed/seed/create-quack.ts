import { PrismaService } from '@/core/prisma/prisma.service';
import { PollOption, Quack as PrismaQuack } from '@/generated/prisma/client';
import { QuackMood } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  mood?: QuackMood;
  userId: string;
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
  /** Makes the quack a poll with these answers, in this order. */
  pollAnswers?: string[];
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<PrismaQuack & { pollOptions: PollOption[] }> {
  const { text, mood, userId, createdAt, pollAnswers = [] } = params;

  return await prisma.quack.create({
    data: {
      text,
      mood,
      createdAt,
      pollOptions: {
        create: pollAnswers.map((answer, position) => ({
          text: answer,
          position,
        })),
      },
      user: {
        connect: {
          id: userId,
        },
      },
    },
    include: { pollOptions: { orderBy: { position: 'asc' } } },
  });
}
