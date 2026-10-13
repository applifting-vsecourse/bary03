// What is wrong with a poll's answers, in words the user can act on, or
// undefined when they're fine. A copy of the backend's poll-rules.ts, so the
// form says the same thing the API would before the request is made; keep
// the two in step. Answers arrive trimmed.

export const POLL_MIN_ANSWERS = 2
export const POLL_MAX_ANSWERS = 4
export const ANSWER_MAX_LENGTH = 50

/** Counts what a person sees as characters, so an emoji is one, not two. */
const lengthOf = (value: string): number => [...value].length

// "Pizza" and "pizza" are the same answer.
const sameAnswer = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

export const answerCountProblem = (count: number): string | undefined => {
  if (count < POLL_MIN_ANSWERS) return `A poll needs at least ${POLL_MIN_ANSWERS} answers.`
  if (count > POLL_MAX_ANSWERS) return `A poll can have at most ${POLL_MAX_ANSWERS} answers.`
  return undefined
}

/** What is wrong with answer number `index + 1`, given all the answers. */
export const answerProblem = (answers: string[], index: number): string | undefined => {
  const answer = answers[index] ?? ""
  if (answer === "") return "Answer is required."
  if (lengthOf(answer) > ANSWER_MAX_LENGTH) {
    return `Answer is too long — use at most ${ANSWER_MAX_LENGTH} characters (you have ${lengthOf(answer)}).`
  }
  // The later of two equal answers is the one to fix.
  const earlier = answers.slice(0, index).findIndex((other) => sameAnswer(other, answer))
  if (earlier !== -1) return `This answer is the same as answer ${earlier + 1}.`
  return undefined
}
