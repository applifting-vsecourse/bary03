// Likes (cases.md, section 1). The repository is mocked: these tests pin down
// what the service decides — whose like it is and what counts as "not found".
// The counting itself is the database's job (docs/adr/0002) and is covered by
// the integration tests.
import { QuackNotFoundError } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const me = { id: 'u1', role: 'user' } as Identity;
const otherUser = { id: 'u2', role: 'user' } as Identity;
const admin = { id: 'mod', role: 'admin' } as Identity;

const setup = (): {
  repository: ReturnType<typeof mock<QuackRepository>>;
  service: QuacksService;
} => {
  const repository = mock<QuackRepository>();
  repository.likeQuack.mockResolvedValue('done');
  repository.unlikeQuack.mockResolvedValue('done');
  return { repository, service: new QuacksService(repository) };
};

describe('QuacksService likes', () => {
  // R1, R7: the like is recorded for the session's user, whoever wrote the quack
  it('likes a quack as the signed-in user (R1)', async () => {
    const { repository, service } = setup();

    await expect(service.likeQuack(me, 'q1')).resolves.toBeUndefined();

    expect(repository.likeQuack).toHaveBeenCalledWith('q1', 'u1');
  });

  it('lets me like my own quack: no author check (R7)', async () => {
    const { repository, service } = setup();

    await expect(service.likeQuack(me, 'my-quack')).resolves.toBeUndefined();

    expect(repository.likeQuack).toHaveBeenCalledWith('my-quack', 'u1');
    expect(repository.getQuackAuthorId).not.toHaveBeenCalled();
  });

  // R2: the repository changes nothing for a repeat; the service mustn't object
  it('succeeds when I like a quack I already liked (R2)', async () => {
    const { repository, service } = setup();

    await expect(service.likeQuack(me, 'q1')).resolves.toBeUndefined();
    await expect(service.likeQuack(me, 'q1')).resolves.toBeUndefined();

    expect(repository.likeQuack).toHaveBeenCalledTimes(2);
  });

  it('takes back my like as the signed-in user (R3)', async () => {
    const { repository, service } = setup();

    await expect(service.unlikeQuack(me, 'q1')).resolves.toBeUndefined();

    expect(repository.unlikeQuack).toHaveBeenCalledWith('q1', 'u1');
  });

  it('succeeds when I take back a like I never gave (R4)', async () => {
    const { service } = setup();

    await expect(
      service.unlikeQuack(me, 'never-liked'),
    ).resolves.toBeUndefined();
  });

  // R5, R6: each user's like is their own row, so likes add up and an unlike
  // only ever touches the caller's
  it("records each user's like under their own id (R5)", async () => {
    const { repository, service } = setup();

    await service.likeQuack(me, 'q1');
    await service.likeQuack(otherUser, 'q1');

    expect(repository.likeQuack.mock.calls).toEqual([
      ['q1', 'u1'],
      ['q1', 'u2'],
    ]);
  });

  it("takes back only the caller's like, never another user's (R6)", async () => {
    const { repository, service } = setup();

    await expect(service.unlikeQuack(otherUser, 'q1')).resolves.toBeUndefined();

    expect(repository.unlikeQuack).toHaveBeenCalledTimes(1);
    expect(repository.unlikeQuack).toHaveBeenCalledWith('q1', 'u2');
  });

  it("gives an admin no power over other users' likes (R8)", async () => {
    const { repository, service } = setup();

    await expect(service.unlikeQuack(admin, 'q1')).resolves.toBeUndefined();

    // the admin's own like, and nobody else's
    expect(repository.unlikeQuack).toHaveBeenCalledTimes(1);
    expect(repository.unlikeQuack).toHaveBeenCalledWith('q1', 'mod');
  });

  // R11: a placeholder and a missing quack both come back as
  // 'not-found' from the repository
  it("refuses to like a placeholder or a quack that doesn't exist (R11)", async () => {
    const { repository, service } = setup();
    repository.likeQuack.mockResolvedValue('not-found');

    await expect(service.likeQuack(me, 'gone')).rejects.toThrow(
      QuackNotFoundError,
    );
  });

  it("refuses to take back a like on a placeholder or a quack that doesn't exist (R11)", async () => {
    const { repository, service } = setup();
    repository.unlikeQuack.mockResolvedValue('not-found');

    await expect(service.unlikeQuack(me, 'gone')).rejects.toThrow(
      QuackNotFoundError,
    );
  });
});
