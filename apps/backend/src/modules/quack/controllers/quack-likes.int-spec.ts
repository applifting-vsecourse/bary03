// Likes over HTTP against the test database (cases.md, section 2: A1–A17).
// Like is PUT /api/quacks/:id/like and unlike is DELETE /api/quacks/:id/like;
// both answer 204. Every quack and reply in a response carries
// `likes: { count, likedByMe }`, and a placeholder carries `likes: null`.
import { PrismaService } from '@/core/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  resetDatabase,
  signUp,
} from '@test/integration/test-app';
import * as request from 'supertest';

type Likes = { count: number; likedByMe: boolean } | null;
type FeedItem = { id: string; deleted: boolean; likes?: Likes };

describe('Likes API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = (): ReturnType<typeof request> => request(app.getHttpServer());

  let userCounter = 0;
  /** Signs up a fresh user and returns their session cookie. */
  const aUser = (name = 'Test Duck'): Promise<string[]> => {
    userCounter += 1;
    return signUp(app, {
      email: `duck${userCounter}@example.com`,
      password: 'password1',
      name,
    });
  };

  /** Signs up a fresh user and gives them the admin (moderator) role. */
  const anAdmin = async (): Promise<string[]> => {
    const cookies = await aUser('Moderator Duck');
    await app.get(PrismaService).user.update({
      where: { email: `duck${userCounter}@example.com` },
      data: { role: 'admin' },
    });
    return cookies;
  };

  const postQuack = async (
    cookies: string[],
    text = 'quack quack',
  ): Promise<string> => {
    const response = await http()
      .post('/api/quacks')
      .set('Cookie', cookies)
      .send({ text })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const postReply = async (
    cookies: string[],
    quackId: string,
    text = 'a reply',
  ): Promise<string> => {
    const response = await http()
      .post(`/api/quacks/${quackId}/replies`)
      .set('Cookie', cookies)
      .send({ text })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const like = (cookies: string[], quackId: string): request.Test =>
    http().put(`/api/quacks/${quackId}/like`).set('Cookie', cookies);

  const unlike = (cookies: string[], quackId: string): request.Test =>
    http().delete(`/api/quacks/${quackId}/like`).set('Cookie', cookies);

  const deleteQuack = (cookies: string[], quackId: string): request.Test =>
    http().delete(`/api/quacks/${quackId}`).set('Cookie', cookies).expect(204);

  /** The quack as it appears in `cookies`' user's feed. */
  const fromFeed = async (
    cookies: string[],
    quackId: string,
  ): Promise<FeedItem | undefined> => {
    const response = await http()
      .get('/api/quacks')
      .set('Cookie', cookies)
      .expect(200);
    return (response.body as FeedItem[]).find((item) => item.id === quackId);
  };

  const likesInFeed = async (
    cookies: string[],
    quackId: string,
  ): Promise<Likes | undefined> => (await fromFeed(cookies, quackId))?.likes;

  const likesInReplies = async (
    cookies: string[],
    quackId: string,
    replyId: string,
  ): Promise<Likes | undefined> => {
    const response = await http()
      .get(`/api/quacks/${quackId}/replies`)
      .set('Cookie', cookies)
      .expect(200);
    return (response.body as FeedItem[]).find((item) => item.id === replyId)
      ?.likes;
  };

  it('A1: liking takes the count from 0 to 1', async () => {
    const me = await aUser();
    const quackId = await postQuack(me);
    expect(await likesInFeed(me, quackId)).toEqual({
      count: 0,
      likedByMe: false,
    });

    await like(me, quackId).expect(204);

    expect(await likesInFeed(me, quackId)).toEqual({
      count: 1,
      likedByMe: true,
    });
  });

  it('A2: liking twice keeps the count at 1', async () => {
    const me = await aUser();
    const quackId = await postQuack(me);
    await like(me, quackId).expect(204);

    await like(me, quackId).expect(204);

    expect(await likesInFeed(me, quackId)).toEqual({
      count: 1,
      likedByMe: true,
    });
  });

  it('A3: taking back my like takes the count from 1 to 0', async () => {
    const me = await aUser();
    const quackId = await postQuack(me);
    await like(me, quackId).expect(204);

    await unlike(me, quackId).expect(204);

    expect(await likesInFeed(me, quackId)).toEqual({
      count: 0,
      likedByMe: false,
    });
  });

  it('A4: taking back a like I never gave succeeds and changes nothing', async () => {
    const me = await aUser();
    const quackId = await postQuack(me);

    await unlike(me, quackId).expect(204);

    expect(await likesInFeed(me, quackId)).toEqual({
      count: 0,
      likedByMe: false,
    });
  });

  it('A5: two users liking the same quack make a count of 2', async () => {
    const userA = await aUser('Duck A');
    const userB = await aUser('Duck B');
    const quackId = await postQuack(userA);

    await like(userA, quackId).expect(204);
    await like(userB, quackId).expect(204);

    expect(await likesInFeed(userA, quackId)).toEqual({
      count: 2,
      likedByMe: true,
    });
    expect(await likesInFeed(userB, quackId)).toEqual({
      count: 2,
      likedByMe: true,
    });
  });

  it('A6: "liked by me" is per user, the count is the same for everyone', async () => {
    const userA = await aUser('Duck A');
    const userB = await aUser('Duck B');
    const quackId = await postQuack(userB);

    await like(userA, quackId).expect(204);

    expect(await likesInFeed(userA, quackId)).toEqual({
      count: 1,
      likedByMe: true,
    });
    expect(await likesInFeed(userB, quackId)).toEqual({
      count: 1,
      likedByMe: false,
    });
  });

  it("A7: one user's unlike doesn't touch another user's like", async () => {
    const userA = await aUser('Duck A');
    const userB = await aUser('Duck B');
    const quackId = await postQuack(userA);
    await like(userA, quackId).expect(204);
    await like(userB, quackId).expect(204);

    await unlike(userB, quackId).expect(204);

    expect(await likesInFeed(userA, quackId)).toEqual({
      count: 1,
      likedByMe: true,
    });
  });

  it('A8: I can like my own quack', async () => {
    const me = await aUser();
    const myQuack = await postQuack(me);

    await like(me, myQuack).expect(204);

    expect(await likesInFeed(me, myQuack)).toEqual({
      count: 1,
      likedByMe: true,
    });
  });

  it("A9: an admin can't remove another user's like", async () => {
    const regular = await aUser('Regular Duck');
    const quackId = await postQuack(regular);
    await like(regular, quackId).expect(204);
    const admin = await anAdmin();

    await unlike(admin, quackId).expect(204);

    expect(await likesInFeed(regular, quackId)).toEqual({
      count: 1,
      likedByMe: true,
    });
    expect(await likesInFeed(admin, quackId)).toEqual({
      count: 1,
      likedByMe: false,
    });
  });

  it('A10: a signed-out visitor gets 401 for like and unlike, and nothing changes', async () => {
    const me = await aUser();
    const quackId = await postQuack(me);
    await like(me, quackId).expect(204);

    await http().put(`/api/quacks/${quackId}/like`).expect(401);
    await http().delete(`/api/quacks/${quackId}/like`).expect(401);

    expect(await likesInFeed(me, quackId)).toEqual({
      count: 1,
      likedByMe: true,
    });
  });

  it("A11: a reply can be liked, and its parent's count doesn't change", async () => {
    const me = await aUser();
    const quackId = await postQuack(me);
    const replyId = await postReply(me, quackId);

    await like(me, replyId).expect(204);

    expect(await likesInReplies(me, quackId, replyId)).toEqual({
      count: 1,
      likedByMe: true,
    });
    expect(await likesInFeed(me, quackId)).toEqual({
      count: 0,
      likedByMe: false,
    });
  });

  it("A12: replying to a quack doesn't change its likes", async () => {
    const userA = await aUser('Duck A');
    const userB = await aUser('Duck B');
    const quackId = await postQuack(userA);
    await like(userA, quackId).expect(204);
    await like(userB, quackId).expect(204);

    await postReply(userB, quackId);

    expect(await likesInFeed(userA, quackId)).toEqual({
      count: 2,
      likedByMe: true,
    });
  });

  it('A13: replies carry their count and "liked by me"', async () => {
    const author = await aUser('Author Duck');
    const me = await aUser('Me Duck');
    const quackId = await postQuack(author);
    const replyId = await postReply(author, quackId);
    await like(me, replyId).expect(204);

    expect(await likesInReplies(me, quackId, replyId)).toEqual({
      count: 1,
      likedByMe: true,
    });
    expect(await likesInReplies(author, quackId, replyId)).toEqual({
      count: 1,
      likedByMe: false,
    });
  });

  it('A14: liking or unliking a placeholder returns 404 and stores nothing', async () => {
    const author = await aUser('Author Duck');
    const me = await aUser('Me Duck');
    const quackId = await postQuack(author);
    await postReply(me, quackId);
    await deleteQuack(author, quackId); // wiped to a placeholder

    await like(me, quackId).expect(404);
    await unlike(me, quackId).expect(404);

    const placeholder = await fromFeed(me, quackId);
    expect(placeholder).toMatchObject({ deleted: true, likes: null });
  });

  it('A15: a liked quack that is wiped comes back with no likes', async () => {
    const author = await aUser('Author Duck');
    const userA = await aUser('Duck A');
    const userB = await aUser('Duck B');
    const quackId = await postQuack(author);
    await postReply(userA, quackId);
    for (const liker of [author, userA, userB]) {
      await like(liker, quackId).expect(204);
    }

    await deleteQuack(author, quackId);

    const placeholder = await fromFeed(userA, quackId);
    expect(placeholder).toMatchObject({ deleted: true });
    // `likes` is present and null: no count, no "liked by me"
    expect(placeholder).toHaveProperty('likes', null);
  });

  it('A16: deleting a liked quack without replies removes it and its likes', async () => {
    const author = await aUser('Author Duck');
    const me = await aUser('Me Duck');
    const quackId = await postQuack(author);
    await like(me, quackId).expect(204);

    await deleteQuack(author, quackId);

    expect(await fromFeed(me, quackId)).toBeUndefined();
    await like(me, quackId).expect(404);
    await unlike(me, quackId).expect(404);
  });

  it('A17: an unknown quack returns 404 for like and unlike', async () => {
    const me = await aUser();

    await like(me, 'does-not-exist').expect(404);
    await unlike(me, 'does-not-exist').expect(404);
  });
});
