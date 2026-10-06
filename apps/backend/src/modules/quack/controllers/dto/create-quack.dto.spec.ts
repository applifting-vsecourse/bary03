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
});
