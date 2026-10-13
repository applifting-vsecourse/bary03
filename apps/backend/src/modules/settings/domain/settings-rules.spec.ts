import { bioProblem, nameProblem, usernameProblem } from './settings-rules';

// The frontend's settingsRules.test.ts runs the same cases; keep them in step.
describe('usernameProblem', () => {
  it.each(['abc', 'a'.repeat(30), 'Bread.Critic_42'])('accepts %j', (value) => {
    expect(usernameProblem(value)).toBeUndefined();
  });

  it.each([
    ['', 'Username is required.'],
    ['ab', 'Username is too short — use at least 3 characters.'],
    [
      'a'.repeat(34),
      'Username is too long — use at most 30 characters (you have 34).',
    ],
    ['bread critic', "Spaces aren't allowed. Use a dot or underscore instead."],
    [
      'bread#critic',
      '"#" isn\'t allowed. Use only letters, numbers, dots and underscores.',
    ],
    [
      'bread-critic',
      '"-" isn\'t allowed. Use only letters, numbers, dots and underscores.',
    ],
    [
      'kachnička',
      '"č" isn\'t allowed. Use only letters, numbers, dots and underscores.',
    ],
    [
      'duck🦆',
      '"🦆" isn\'t allowed. Use only letters, numbers, dots and underscores.',
    ],
    // what to fix first: the character, then the length
    [
      'a#',
      '"#" isn\'t allowed. Use only letters, numbers, dots and underscores.',
    ],
    ['a b', "Spaces aren't allowed. Use a dot or underscore instead."],
  ])('says what is wrong with %j', (value, message) => {
    expect(usernameProblem(value)).toBe(message);
  });
});

describe('nameProblem', () => {
  it.each(['D', 'a'.repeat(50)])('accepts %j', (value) => {
    expect(nameProblem(value)).toBeUndefined();
  });

  it.each([
    ['', 'Display name is required.'],
    [
      'a'.repeat(52),
      'Display name is too long — use at most 50 characters (you have 52).',
    ],
  ])('says what is wrong with %j', (value, message) => {
    expect(nameProblem(value)).toBe(message);
  });
});

describe('bioProblem', () => {
  it.each(['', 'a'.repeat(160), '🦆'.repeat(160)])('accepts %j', (value) => {
    expect(bioProblem(value)).toBeUndefined();
  });

  it('says how long a bio is when it is too long', () => {
    expect(bioProblem('a'.repeat(172))).toBe(
      'Bio is too long — use at most 160 characters (you have 172).',
    );
  });
});
