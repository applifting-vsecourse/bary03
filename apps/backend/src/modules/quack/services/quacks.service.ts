import {
  NotAPollOptionError,
  PollNotFoundError,
  Quack,
  QuackMood,
  QuackPoll,
} from '@/modules/quack/domain/quack';
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

  async getQuacks(viewer: Identity, search?: string): Promise<Quack[]> {
    return this.quackRepository.getQuacks(viewer.id, normalizeSearch(search));
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

  /**
   * Sets the user's vote in a poll, replacing any earlier one, and returns the
   * poll as it is after the vote, counts included.
   */
  async vote(
    user: Identity,
    quackId: string,
    optionId: string,
  ): Promise<QuackPoll> {
    const optionIds = await this.quackRepository.getPollOptionIds(quackId);
    if (optionIds.length === 0) {
      throw new PollNotFoundError(quackId);
    }
    if (!optionIds.includes(optionId)) {
      throw new NotAPollOptionError(optionId, quackId);
    }
    // the voter is taken from the session, never from the request body
    await this.quackRepository.setVote({ quackId, userId: user.id, optionId });
    const poll = await this.quackRepository.getPoll(quackId, user.id);
    if (!poll) {
      throw new PollNotFoundError(quackId);
    }
    return poll;
  }
}
