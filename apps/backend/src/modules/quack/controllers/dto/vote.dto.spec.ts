import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { VoteDto } from './vote.dto';

const valid = {
  optionId: 'pizza',
  clientId: '3a97449c-b9d8-4c2b-b9ab-20f0cde75aa6',
  clientSeq: 1,
};

const errorsFor = async (body: object): Promise<ValidationError[]> =>
  validate(plainToInstance(VoteDto, { ...valid, ...body }));

describe('VoteDto', () => {
  it('accepts an answer with the tab and its click number', async () => {
    await expect(errorsFor({})).resolves.toHaveLength(0);
  });

  it.each([
    ['optionId', ''],
    ['clientId', 'not-a-uuid'],
    ['clientSeq', -1],
    ['clientSeq', 1.5],
    ['clientSeq', '2'],
    ['clientSeq', 2_147_483_648],
  ])('rejects %s = %j', async (property, value) => {
    const errors = await errorsFor({ [property]: value });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe(property);
  });

  it.each(['optionId', 'clientId', 'clientSeq'])(
    'requires %s',
    async (property) => {
      const errors = await errorsFor({ [property]: undefined });

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(property);
    },
  );
});
