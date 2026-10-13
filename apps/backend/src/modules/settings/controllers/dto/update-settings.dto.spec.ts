import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdateSettingsDto } from './update-settings.dto';

const valid = { username: 'Bread.Critic_1', name: 'The Bread Critic' };

const errorsFor = async (body: object): Promise<ValidationError[]> =>
  validate(plainToInstance(UpdateSettingsDto, { ...valid, ...body }));

describe('UpdateSettingsDto', () => {
  it('accepts a username, a name and nothing else', async () => {
    await expect(errorsFor({})).resolves.toHaveLength(0);
  });

  it('accepts a bio and a default mood', async () => {
    await expect(
      errorsFor({ bio: 'Crumbs.', defaultMood: 'silly' }),
    ).resolves.toHaveLength(0);
  });

  it('accepts no default mood', async () => {
    await expect(errorsFor({ defaultMood: null })).resolves.toHaveLength(0);
  });

  it.each(['abc', 'a'.repeat(30), 'bread.critic', 'bread_critic', 'Duck42'])(
    'accepts the username %j',
    async (username) => {
      await expect(errorsFor({ username })).resolves.toHaveLength(0);
    },
  );

  it.each([
    'ab',
    'a'.repeat(31),
    'bread critic',
    'bread-critic',
    '@bread',
    'kachnička',
  ])('rejects the username %j', async (username) => {
    const errors = await errorsFor({ username });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('username');
  });

  it('ignores spaces around the username', async () => {
    await expect(
      errorsFor({ username: '  breadcritic ' }),
    ).resolves.toHaveLength(0);
  });

  it.each(['', '   '])('rejects the name %j', async (name) => {
    const errors = await errorsFor({ name });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
  });

  it('rejects a bio longer than 160 characters', async () => {
    await expect(errorsFor({ bio: 'a'.repeat(160) })).resolves.toHaveLength(0);

    const errors = await errorsFor({ bio: 'a'.repeat(161) });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('bio');
  });

  it('rejects an unknown mood', async () => {
    const errors = await errorsFor({ defaultMood: 'grumpy' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('defaultMood');
  });

  it('says exactly what is wrong with the username', async () => {
    const errors = await errorsFor({ username: 'a'.repeat(34) });

    expect(errors[0].constraints).toEqual({
      username:
        'Username is too long — use at most 30 characters (you have 34).',
    });
  });

  it('gives one message, not two, for a username that is not text', async () => {
    const errors = await errorsFor({ username: 42 });

    expect(Object.keys(errors[0].constraints ?? {})).toEqual(['isString']);
  });

  it('says how long the bio is when it is too long', async () => {
    const errors = await errorsFor({ bio: 'a'.repeat(172) });

    expect(errors[0].constraints).toEqual({
      bio: 'Bio is too long — use at most 160 characters (you have 172).',
    });
  });

  it('says the display name is required', async () => {
    const errors = await errorsFor({ name: '  ' });

    expect(errors[0].constraints).toEqual({
      displayName: 'Display name is required.',
    });
  });
});
