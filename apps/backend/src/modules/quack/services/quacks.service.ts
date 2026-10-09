import { Quack, QuackMood } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

// Surrounding spaces and a leading @ (as in "@BreadCritic") don't count.
// Nothing left means no search: the full feed.
const normalizeSearch = (search?: string): string | undefined => {
  const term = search?.trim().replace(/^@/, '');
  return term ? term : undefined;
};

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(search?: string): Promise<Quack[]> {
    return this.quackRepository.getQuacks(normalizeSearch(search));
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood?: QuackMood },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood ?? null,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
