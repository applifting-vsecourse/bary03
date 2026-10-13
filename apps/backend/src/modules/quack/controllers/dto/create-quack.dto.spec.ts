import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateQuackDto } from './create-quack.dto';

const errorsFor = async (body: object): Promise<ValidationError[]> =>
  validate(plainToInstance(CreateQuackDto, body));

describe('CreateQuackDto', () => {
  it('accepts a quack without a mood', async () => {
    await expect(errorsFor({ text: 'hello' })).resolves.toHaveLength(0);
  });

  it.each(['happy', 'sad', 'angry', 'silly'])(
    'accepts the %s mood',
    async (mood) => {
      await expect(errorsFor({ text: 'hello', mood })).resolves.toHaveLength(0);
    },
  );

  it('rejects an unknown mood', async () => {
    const errors = await errorsFor({ text: 'hello', mood: 'grumpy' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('mood');
  });

  describe('poll', () => {
    it('accepts 2 to 4 answers', async () => {
      await expect(
        errorsFor({ text: 'Lunch?', poll: { answers: ['Pizza', 'Ramen'] } }),
      ).resolves.toHaveLength(0);
      await expect(
        errorsFor({
          text: 'Lunch?',
          poll: { answers: ['Pizza', 'Ramen', 'Salad bar', 'Sushi'] },
        }),
      ).resolves.toHaveLength(0);
    });

    it('trims the answers', () => {
      const dto = plainToInstance(CreateQuackDto, {
        text: 'Lunch?',
        poll: { answers: ['  Pizza ', 'Ramen'] },
      });

      expect(dto.poll).toEqual({ answers: ['Pizza', 'Ramen'] });
    });

    it.each([
      [['Pizza'], 'A poll needs at least 2 answers.'],
      [['a', 'b', 'c', 'd', 'e'], 'A poll can have at most 4 answers.'],
      [['Pizza', '   '], 'Answer is required.'],
      [
        ['Pizza', 'a'.repeat(57)],
        'Answer is too long — use at most 50 characters (you have 57).',
      ],
      [['Pizza', ' pizza '], 'This answer is the same as answer 1.'],
    ])('says what is wrong with %j', async (answers, message) => {
      const errors = await errorsFor({ text: 'Lunch?', poll: { answers } });

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toEqual({ poll: message });
    });

    it.each([
      ['a list', ['Pizza', 'Ramen']],
      ['answers that are not text', { answers: ['Pizza', 2] }],
      ['extra fields', { answers: ['Pizza', 'Ramen'], closesAt: 'never' }],
      ['no answers', {}],
    ])('rejects a poll given as %s', async (_what, poll) => {
      const errors = await errorsFor({ text: 'Lunch?', poll });

      expect(errors[0].constraints).toEqual({
        poll: 'poll must be an object with only a list of answers.',
      });
    });
  });
});
