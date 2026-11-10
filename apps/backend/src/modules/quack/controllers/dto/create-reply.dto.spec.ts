import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateReplyDto } from './create-reply.dto';

const errorsFor = async (body: object): Promise<ValidationError[]> =>
  validate(plainToInstance(CreateReplyDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

const messagesFor = async (body: object): Promise<string[]> =>
  (await errorsFor(body)).flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );

describe('CreateReplyDto', () => {
  it('accepts text', async () => {
    await expect(
      errorsFor({ text: 'ok but who reflects the pond' }),
    ).resolves.toHaveLength(0);
  });

  it('ignores spaces around the text', async () => {
    const dto = plainToInstance(CreateReplyDto, { text: '  quack  ' });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.text).toBe('quack');
  });

  it.each(['', '   '])('rejects the empty reply %j', async (text) => {
    await expect(messagesFor({ text })).resolves.toEqual([
      "Reply can't be empty — write something first.",
    ]);
  });

  it('says how long a reply that is too long is', async () => {
    await expect(messagesFor({ text: 'a'.repeat(312) })).resolves.toEqual([
      'Reply is too long — use at most 280 characters (you have 312).',
    ]);
  });

  it('rejects text that is not a string with one message', async () => {
    await expect(messagesFor({ text: 42 })).resolves.toEqual([
      'Reply must be text.',
    ]);
  });

  it.each([{ mood: 'happy' }, { poll: { answers: ['a', 'b'] } }])(
    'rejects anything but text: %j',
    async (extra) => {
      const errors = await errorsFor({ text: 'quack', ...extra });

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(Object.keys(extra)[0]);
    },
  );
});
