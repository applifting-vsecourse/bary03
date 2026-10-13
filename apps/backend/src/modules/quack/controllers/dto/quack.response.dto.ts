import { Quack, QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

class PollOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'How many people picked this answer' })
  votes!: number;
}

export class PollResponseDto {
  @ApiProperty({
    type: [PollOptionResponseDto],
    description: 'In the order the author typed them',
  })
  options!: PollOptionResponseDto[];

  @ApiProperty({ description: "Sum of the answers' votes" })
  totalVotes!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The answer the signed-in user picked; null if they have not voted',
  })
  myOptionId!: string | null;
}

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  mood!: QuackMood | null;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  @ApiProperty({
    type: PollResponseDto,
    nullable: true,
    description:
      'The answers and their votes; null when the quack is not a poll',
  })
  poll!: PollResponseDto | null;

  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.user) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user to be loaded for quack ${quack.id}`,
      );
    }
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      createdAt: quack.createdAt,
      user: {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username,
      },
      poll: quack.poll,
    };
  }
}
