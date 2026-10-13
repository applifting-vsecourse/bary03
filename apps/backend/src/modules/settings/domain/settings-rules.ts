// What is wrong with a value, in words the user can act on, or undefined when
// it's fine. The frontend has a copy of these rules (settingsRules.ts) so it
// can say the same thing before the request is made; keep the two in step.
// Values arrive trimmed.

// Same limits BetterAuth's username plugin applies at sign-up.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 160;

const USERNAME_CHARACTER = /^[a-zA-Z0-9._]$/;

// Counts what a person sees as characters, so an emoji is one, not two.
const lengthOf = (value: string): number => [...value].length;

const tooLong = (what: string, max: number, value: string): string =>
  `${what} is too long — use at most ${max} characters (you have ${lengthOf(value)}).`;

export const usernameProblem = (value: string): string | undefined => {
  if (value === '') return 'Username is required.';
  if (/\s/.test(value)) {
    return "Spaces aren't allowed. Use a dot or underscore instead.";
  }
  const forbidden = [...value].find((char) => !USERNAME_CHARACTER.test(char));
  if (forbidden) {
    return `"${forbidden}" isn't allowed. Use only letters, numbers, dots and underscores.`;
  }
  if (lengthOf(value) < USERNAME_MIN_LENGTH) {
    return `Username is too short — use at least ${USERNAME_MIN_LENGTH} characters.`;
  }
  if (lengthOf(value) > USERNAME_MAX_LENGTH) {
    return tooLong('Username', USERNAME_MAX_LENGTH, value);
  }
  return undefined;
};

export const nameProblem = (value: string): string | undefined => {
  if (value === '') return 'Display name is required.';
  if (lengthOf(value) > NAME_MAX_LENGTH) {
    return tooLong('Display name', NAME_MAX_LENGTH, value);
  }
  return undefined;
};

export const bioProblem = (value: string): string | undefined =>
  lengthOf(value) > BIO_MAX_LENGTH
    ? tooLong('Bio', BIO_MAX_LENGTH, value)
    : undefined;
