// What is wrong with a reply, in words the user can act on, or undefined when
// it's fine. The frontend has a copy of these rules (replyRules.ts) so it can
// say the same thing before the request is made; keep the two in step.
// Values arrive trimmed.

export const REPLY_MAX_LENGTH = 280;

// Counts what a person sees as characters, so an emoji is one, not two.
const lengthOf = (value: string): number => [...value].length;

export const replyTextProblem = (value: string): string | undefined => {
  if (value === '') return "Reply can't be empty — write something first.";
  if (lengthOf(value) > REPLY_MAX_LENGTH) {
    return `Reply is too long — use at most ${REPLY_MAX_LENGTH} characters (you have ${lengthOf(value)}).`;
  }
  return undefined;
};
