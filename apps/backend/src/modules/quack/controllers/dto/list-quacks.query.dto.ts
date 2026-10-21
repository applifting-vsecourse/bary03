import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListQuacksQueryDto {
  @ApiPropertyOptional({
    description:
      'Only return quacks whose text, author name or username contains this phrase (case-insensitive; a leading @ is ignored)',
    example: 'sourdough',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description:
      '"true" returns only the signed-in user\'s own quacks. The author always comes from the session.',
    enum: ['true', 'false'],
    example: 'true',
  })
  @IsOptional()
  // Kept as the string the URL carries: Boolean("false") would be true.
  @IsIn(['true', 'false'], {
    message: ({ value }) =>
      `mine must be "true" or "false" (you sent ${JSON.stringify(value)}).`,
  })
  mine?: 'true' | 'false';
}
