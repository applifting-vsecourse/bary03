import { Quack } from '@/modules/quack/domain/quack';
import { QuackResponseDto } from './quack.response.dto';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'If a pond reflects the sky…',
  mood: 'sad',
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Deep Duck Thoughts', username: 'DeepDuckThoughts' },
  poll: null,
  replyCount: 2,
  ...overrides,
});

describe('QuackResponseDto', () => {
  it('sends a live quack with its text and author', () => {
    expect(QuackResponseDto.fromDomain(aQuack())).toMatchObject({
      deleted: false,
      text: 'If a pond reflects the sky…',
      user: { name: 'Deep Duck Thoughts' },
      replyCount: 2,
    });
  });

  it('sends a placeholder with nothing of the deleted quack', () => {
    // Even if the domain object somehow still carried text, mood or an
    // author, none of it goes out: the placeholder is built from scratch.
    const dto = QuackResponseDto.fromDomain(
      aQuack({ userId: null, text: 'leftover', mood: 'sad' }),
    );

    expect(dto).toEqual({
      id: 'q1',
      deleted: true,
      text: null,
      mood: null,
      userId: null,
      createdAt: new Date('2026-01-01T12:00:00Z'),
      user: null,
      poll: null,
      replyCount: 2,
    });
    expect(JSON.stringify(dto)).not.toMatch(/leftover|Deep Duck|u1/);
  });
});
