import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ListQuacksQueryDto } from './list-quacks.query.dto';

const errorsFor = async (query: object): Promise<ValidationError[]> =>
  validate(plainToInstance(ListQuacksQueryDto, query));

describe('ListQuacksQueryDto', () => {
  it('accepts no search', async () => {
    await expect(errorsFor({})).resolves.toHaveLength(0);
  });

  it('accepts a search phrase', async () => {
    await expect(errorsFor({ q: 'sourdough' })).resolves.toHaveLength(0);
  });

  it('rejects a search longer than 100 characters', async () => {
    const errors = await errorsFor({ q: 'a'.repeat(101) });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('q');
  });
});
