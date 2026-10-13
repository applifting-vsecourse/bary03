import {
  ANSWER_MAX_LENGTH,
  POLL_MAX_ANSWERS,
  POLL_MIN_ANSWERS,
  pollProblem,
} from '@/modules/quack/domain/poll-rules';
import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
} from 'class-validator';

type PollInput = { answers: string[] };

const isPollInput = (value: unknown): value is PollInput =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).length === 1 &&
  Array.isArray((value as PollInput).answers) &&
  (value as PollInput).answers.every((answer) => typeof answer === 'string');

const NOT_A_POLL = 'poll must be an object with only a list of answers.';

const trimAnswers = ({ value }: { value: unknown }): unknown =>
  isPollInput(value)
    ? { answers: value.answers.map((answer) => answer.trim()) }
    : value;

/**
 * Checks the poll as a whole with the shared rules, so the API answers with
 * the form's own sentence ("Answer is required.") rather than one prefixed
 * with a property path, as nested validation would.
 */
const IsValidPoll = (): PropertyDecorator =>
  ValidateBy({
    name: 'poll',
    validator: {
      validate: (value: unknown) =>
        isPollInput(value) && pollProblem(value.answers) === undefined,
      defaultMessage: (args) =>
        isPollInput(args?.value)
          ? (pollProblem(args.value.answers) ?? '')
          : NOT_A_POLL,
    },
  });

// For the API docs only: the shape of `poll`.
class CreatePollDto {
  @ApiProperty({
    type: [String],
    description: `${POLL_MIN_ANSWERS}–${POLL_MAX_ANSWERS} answers, each at most ${ANSWER_MAX_LENGTH} characters, no two the same ignoring case; surrounding spaces are ignored`,
    example: ['Pizza', 'Ramen', 'Salad bar'],
    minItems: POLL_MIN_ANSWERS,
    maxItems: POLL_MAX_ANSWERS,
  })
  answers!: string[];
}

export class CreateQuackDto {
  @ApiProperty({
    description: 'Body of the quack; the question when it has a poll',
    example: 'Hello, world!',
    maxLength: 280,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text!: string;

  @ApiPropertyOptional({
    description: 'How the author feels; omit for no mood',
    enum: QUACK_MOODS,
  })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  mood?: QuackMood;

  @ApiPropertyOptional({
    type: CreatePollDto,
    description: 'Makes the quack a poll with these answers; omit for none',
  })
  @Transform(trimAnswers)
  @IsOptional()
  @IsValidPoll()
  poll?: PollInput;
}
