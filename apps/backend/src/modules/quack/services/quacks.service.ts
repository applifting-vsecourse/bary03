import {
  NotAPollOptionError,
  NotQuackAuthorError,
  PollNotFoundError,
  Quack,
  QuackMood,
  QuackNotFoundError,
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

  /** With `mine`, only the viewer's own quacks: the author is the session's user. */
  async getQuacks(
    viewer: Identity,
    filter: { search?: string; mine?: boolean } = {},
  ): Promise<Quack[]> {
    return this.quackRepository.getQuacks(viewer.id, {
      search: normalizeSearch(filter.search),
      authorId: filter.mine ? viewer.id : undefined,
    });
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood?: QuackMood; pollAnswers?: string[] },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood ?? null,
      pollAnswers: quackData.pollAnswers ?? [],
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }

  /**
   * Deletes a quack, but only for its author. The user is the session's user,
   * never anything the caller sends.
   */
  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const authorId = await this.quackRepository.getQuackAuthorId(quackId);
    if (authorId === null) {
      throw new QuackNotFoundError(quackId);
    }
    if (authorId !== user.id) {
      throw new NotQuackAuthorError(quackId, user.id);
    }
    // The repository matches the author again in the delete itself, so the
    // quack can't change hands (or vanish) between the check and the delete.
    const deleted = await this.quackRepository.deleteQuack(quackId, user.id);
    if (!deleted) {
      throw new QuackNotFoundError(quackId);
    }
  }

  /**
   * Sets the user's vote in a poll, replacing any earlier one unless it is an
   * older click from the same tab, and returns the poll as it is now, counts
   * included.
   */
  async vote(
    user: Identity,
    quackId: string,
    vote: { optionId: string; clientId: string; clientSeq: number },
  ): Promise<QuackPoll> {
    const { optionId, clientId, clientSeq } = vote;
    const optionIds = await this.quackRepository.getPollOptionIds(quackId);
    if (optionIds.length === 0) {
      throw new PollNotFoundError(quackId);
    }
    if (!optionIds.includes(optionId)) {
      throw new NotAPollOptionError(optionId, quackId);
    }
    // the voter is taken from the session, never from the request body
    await this.quackRepository.setVote({
      quackId,
      userId: user.id,
      optionId,
      clientId,
      clientSeq,
    });
    const poll = await this.quackRepository.getPoll(quackId, user.id);
    if (!poll) {
      throw new PollNotFoundError(quackId);
    }
    return poll;
  }
}
