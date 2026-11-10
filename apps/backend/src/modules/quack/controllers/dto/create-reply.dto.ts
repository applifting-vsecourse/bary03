import {
  REPLY_MAX_LENGTH,
  replyTextProblem,
} from '@/modules/quack/domain/reply-rules';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, ValidateBy } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Text only: the controller's whitelist refuses anything else (mood, poll).
export class CreateReplyDto {
  @ApiProperty({
    description: `The reply, 1–${REPLY_MAX_LENGTH} characters; surrounding spaces are ignored`,
    example: 'ok but who reflects the pond',
    maxLength: REPLY_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString({ message: 'Reply must be text.' })
  // Non-strings are left to @IsString, so the user gets one message, not two.
  @ValidateBy({
    name: 'replyText',
    validator: {
      validate: (value: unknown) =>
        typeof value !== 'string' || replyTextProblem(value) === undefined,
      defaultMessage: (args) => replyTextProblem(args?.value as string) ?? '',
    },
  })
  text!: string;
}
