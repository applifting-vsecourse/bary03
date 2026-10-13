import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

// Largest value Postgres' integer column holds.
const MAX_CLIENT_SEQ = 2_147_483_647;

export class VoteDto {
  @ApiProperty({ description: 'The id of the answer to vote for' })
  @IsString()
  @IsNotEmpty()
  optionId!: string;

  @ApiProperty({
    description:
      'Random id of the browser tab sending the vote, made once per page load',
    format: 'uuid',
  })
  @IsUUID()
  clientId!: string;

  @ApiProperty({
    description:
      "That tab's click counter, higher for every click. A vote from the same tab with a lower or equal number than the stored one is ignored, so a late older click can't overwrite a newer one.",
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Max(MAX_CLIENT_SEQ)
  clientSeq!: number;
}
