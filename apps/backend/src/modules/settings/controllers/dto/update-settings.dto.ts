import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import {
  BIO_MAX_LENGTH,
  bioProblem,
  NAME_MAX_LENGTH,
  nameProblem,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  usernameProblem,
} from '@/modules/settings/domain/settings-rules';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Fails with whatever `problem` says is wrong. Non-strings are left to
 * @IsString, so the user gets one message, not two.
 */
const HasNoProblem = (
  name: string,
  problem: (value: string) => string | undefined,
  options?: ValidationOptions,
): PropertyDecorator =>
  ValidateBy(
    {
      name,
      validator: {
        validate: (value: unknown) =>
          typeof value !== 'string' || problem(value) === undefined,
        defaultMessage: (args) => problem(args?.value as string) ?? '',
      },
    },
    options,
  );

export class UpdateSettingsDto {
  @ApiProperty({
    description: `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} letters, numbers, dots or underscores`,
    example: 'BreadCritic',
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
    pattern: '^[a-zA-Z0-9._]+$',
  })
  @Transform(trim)
  @IsString()
  @HasNoProblem('username', usernameProblem)
  username!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'The Bread Critic',
    maxLength: NAME_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @HasNoProblem('displayName', nameProblem)
  name!: string;

  @ApiPropertyOptional({
    description: 'Short bio; omit or send empty for none',
    maxLength: BIO_MAX_LENGTH,
    nullable: true,
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @HasNoProblem('bio', bioProblem)
  bio?: string | null;

  @ApiPropertyOptional({
    description: 'Mood the post form starts with; omit or null for none',
    enum: QUACK_MOODS,
    nullable: true,
  })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  defaultMood?: QuackMood | null;
}
