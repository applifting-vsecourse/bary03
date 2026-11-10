import {
  Quack,
  QUACK_MOODS,
  QuackMood,
  Reply,
} from '@/modules/quack/domain/quack';
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

  @ApiProperty({ description: 'How many replies the quack has' })
  replyCount!: number;

  // Nothing deletes a quack into a placeholder yet (story.md: replies), so a
  // quack without text or author is a bug here, not something to send.
  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.user || quack.text === null || quack.userId === null) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack ${quack.id} to have text and a loaded author`,
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
      replyCount: quack.replyCount,
    };
  }
}

export class ReplyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'The quack this reply answers' })
  parentId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  static fromDomain(reply: Reply): ReplyResponseDto {
    return {
      id: reply.id,
      text: reply.text,
      parentId: reply.parentId,
      userId: reply.userId,
      createdAt: reply.createdAt,
      user: {
        id: reply.user.id,
        name: reply.user.name,
        username: reply.user.username,
      },
    };
  }
}
