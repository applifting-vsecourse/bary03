// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import {
  NotAPollOptionError,
  NotQuackAuthorError,
  PollNotFoundError,
  Quack,
  QuackNotFoundError,
  QuackPoll,
} from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  poll: null,
  ...overrides,
});

const viewer = { id: 'u1' } as Identity;

const aVote = (
  optionId: string,
): { optionId: string; clientId: string; clientSeq: number } => ({
  optionId,
  clientId: 'tab-1',
  clientSeq: 7,
});

const lunchPoll = (overrides: Partial<QuackPoll> = {}): QuackPoll => ({
  options: [
    { id: 'pizza', text: 'Pizza', votes: 2 },
    { id: 'ramen', text: 'Ramen', votes: 1 },
  ],
  totalVotes: 3,
  myOptionId: null,
  ...overrides,
});

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(viewer)).resolves.toEqual(quacks);
    // polls are read as the signed-in user sees them (their own answer)
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
      search: undefined,
      authorId: undefined,
    });
  });

  it.each([
    ['sourdough', 'sourdough'],
    ['  Deep Duck  ', 'Deep Duck'],
    ['@BreadCritic', 'BreadCritic'],
    [' @BreadCritic ', 'BreadCritic'],
    ['50%_off', '50%_off'],
  ])('searches for %j as %j', async (search, expected) => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(viewer, { search });

    expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
      search: expected,
      authorId: undefined,
    });
  });

  it.each([undefined, '', '   ', '@'])(
    'treats %j as no search',
    async (search) => {
      const repository = mock<QuackRepository>();
      repository.getQuacks.mockResolvedValue([]);

      await new QuacksService(repository).getQuacks(viewer, { search });

      expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
        search: undefined,
        authorId: undefined,
      });
    },
  );

  it("returns only the signed-in user's quacks for mine", async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(viewer, {
      search: 'bread',
      mine: true,
    });

    // the author comes from the session, not from the caller's query
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
      search: 'bread',
      authorId: 'u1',
    });
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      mood: null,
      userId: 'u1',
      pollAnswers: [],
    });
  });

  it('passes the chosen mood to the repository', async () => {
    const created = aQuack({ id: 'q3', text: 'yay', mood: 'happy' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'yay', mood: 'happy' }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'yay',
      mood: 'happy',
      userId: 'u1',
      pollAnswers: [],
    });
  });

  it('creates a poll with its answers in order', async () => {
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(aQuack());

    await new QuacksService(repository).createQuack(viewer, {
      text: 'Where do we go for lunch?',
      pollAnswers: ['Pizza', 'Ramen', 'Salad bar'],
    });

    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'Where do we go for lunch?',
      mood: null,
      userId: 'u1',
      pollAnswers: ['Pizza', 'Ramen', 'Salad bar'],
    });
  });

  describe('deleteQuack', () => {
    it("deletes the signed-in user's own quack", async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackAuthorId.mockResolvedValue('u1');
      repository.deleteQuack.mockResolvedValue(true);

      await expect(
        new QuacksService(repository).deleteQuack(viewer, 'q1'),
      ).resolves.toBeUndefined();
      expect(repository.deleteQuack).toHaveBeenCalledWith('q1', 'u1');
    });

    it("refuses someone else's quack and deletes nothing", async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackAuthorId.mockResolvedValue('u2');

      await expect(
        new QuacksService(repository).deleteQuack(viewer, 'q1'),
      ).rejects.toBeInstanceOf(NotQuackAuthorError);
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('refuses a quack that does not exist', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackAuthorId.mockResolvedValue(null);

      await expect(
        new QuacksService(repository).deleteQuack(viewer, 'missing'),
      ).rejects.toBeInstanceOf(QuackNotFoundError);
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it('reports a quack deleted between the check and the delete', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackAuthorId.mockResolvedValue('u1');
      repository.deleteQuack.mockResolvedValue(false);

      await expect(
        new QuacksService(repository).deleteQuack(viewer, 'q1'),
      ).rejects.toBeInstanceOf(QuackNotFoundError);
    });
  });

  describe('vote', () => {
    it("sets the signed-in user's vote and returns the poll after it", async () => {
      const after = lunchPoll({
        options: [
          { id: 'pizza', text: 'Pizza', votes: 2 },
          { id: 'ramen', text: 'Ramen', votes: 2 },
        ],
        totalVotes: 4,
        myOptionId: 'ramen',
      });
      const repository = mock<QuackRepository>();
      repository.getPollOptionIds.mockResolvedValue(['pizza', 'ramen']);
      repository.getPoll.mockResolvedValue(after);

      await expect(
        new QuacksService(repository).vote(viewer, 'q1', aVote('ramen')),
      ).resolves.toEqual(after);
      // the voter comes from the session, not from the caller's payload
      expect(repository.setVote).toHaveBeenCalledWith({
        quackId: 'q1',
        userId: 'u1',
        optionId: 'ramen',
        clientId: 'tab-1',
        clientSeq: 7,
      });
      expect(repository.getPoll).toHaveBeenCalledWith('q1', 'u1');
    });

    it('refuses a quack that is not a poll', async () => {
      const repository = mock<QuackRepository>();
      repository.getPollOptionIds.mockResolvedValue([]);

      await expect(
        new QuacksService(repository).vote(viewer, 'q1', aVote('pizza')),
      ).rejects.toBeInstanceOf(PollNotFoundError);
      expect(repository.setVote).not.toHaveBeenCalled();
    });

    it('refuses an answer from outside this poll', async () => {
      const repository = mock<QuackRepository>();
      repository.getPollOptionIds.mockResolvedValue(['pizza', 'ramen']);

      await expect(
        new QuacksService(repository).vote(
          viewer,
          'q1',
          aVote('other-polls-answer'),
        ),
      ).rejects.toBeInstanceOf(NotAPollOptionError);
      expect(repository.setVote).not.toHaveBeenCalled();
    });
  });
});
