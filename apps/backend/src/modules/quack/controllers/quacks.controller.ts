import {
  CannotReplyToReplyError,
  NotAPollOptionError,
  NotQuackAuthorError,
  PollNotFoundError,
  QuackDeletedError,
  QuackNotFoundError,
} from '@/modules/quack/domain/quack';
import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateQuackDto } from './dto/create-quack.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListQuacksQueryDto } from './dto/list-quacks.query.dto';
import {
  PollResponseDto,
  QuackResponseDto,
  ReplyResponseDto,
} from './dto/quack.response.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('quacks')
@Controller('quacks')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QuacksController {
  constructor(private readonly quacksService: QuacksService) {}

  @Get()
  @ApiOperation({
    summary: 'List quacks, newest first, optionally searched or only mine',
  })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid search' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: ListQuacksQueryDto,
  ): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(user, {
      search: query.q,
      mine: query.mine === 'true',
    });
    return quacks.map(QuackResponseDto.fromDomain);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quack, optionally with a poll' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid quack or poll' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateQuackDto,
  ): Promise<QuackResponseDto> {
    const quack = await this.quacksService.createQuack(user, {
      text: body.text,
      mood: body.mood,
      pollAnswers: body.poll?.answers,
    });
    return QuackResponseDto.fromDomain(quack);
  }

  @Delete(':quackId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a quack: your own, or any as a moderator',
    description:
      'The author may delete their quack, and a user with the admin role (moderator) may delete any quack. The user and role come from the session. A poll goes with its answers and votes. A quack with replies is wiped instead: its text, mood, poll and author are erased and it stays as a placeholder ("This quack was deleted") so the replies keep their place. Deleting the last reply under a placeholder removes the placeholder too.',
  })
  @ApiResponse({
    status: 204,
    description: 'Deleted, or wiped to a placeholder',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'Someone else wrote this quack and you are not a moderator',
  })
  @ApiResponse({
    status: 404,
    description: 'No such quack, or it was already deleted',
  })
  async delete(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<void> {
    try {
      await this.quacksService.deleteQuack(user, quackId);
    } catch (error) {
      if (error instanceof QuackNotFoundError) {
        throw new NotFoundException('This quack does not exist');
      }
      if (error instanceof NotQuackAuthorError) {
        throw new ForbiddenException('You can only delete your own quacks');
      }
      throw error;
    }
  }

  @Get(':quackId/replies')
  @ApiOperation({
    summary: "List a quack's replies, oldest first",
    description:
      'A reply has no replies of its own, so asking for those gives an empty list.',
  })
  @ApiResponse({ status: 200, type: [ReplyResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such quack' })
  async listReplies(
    @Param('quackId') quackId: string,
  ): Promise<ReplyResponseDto[]> {
    try {
      const replies = await this.quacksService.getReplies(quackId);
      return replies.map(ReplyResponseDto.fromDomain);
    } catch (error) {
      if (error instanceof QuackNotFoundError) {
        throw new NotFoundException('This quack does not exist');
      }
      throw error;
    }
  }

  @Post(':quackId/replies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Reply to a quack',
    description:
      'Posts a text-only reply under a top-level quack. The author comes from the session. Replies go one level deep: a reply cannot be replied to.',
  })
  @ApiResponse({ status: 201, type: ReplyResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid reply text, or the quack is itself a reply',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such quack' })
  @ApiResponse({
    status: 409,
    description: 'The quack was deleted and takes no new replies',
  })
  async createReply(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: CreateReplyDto,
  ): Promise<ReplyResponseDto> {
    try {
      const reply = await this.quacksService.createReply(user, quackId, {
        text: body.text,
      });
      return ReplyResponseDto.fromDomain(reply);
    } catch (error) {
      if (error instanceof QuackNotFoundError) {
        throw new NotFoundException('This quack does not exist');
      }
      if (error instanceof CannotReplyToReplyError) {
        throw new BadRequestException(
          "You can't reply to a reply — reply to the quack instead.",
        );
      }
      if (error instanceof QuackDeletedError) {
        throw new ConflictException(
          "This quack was deleted, so it can't get new replies.",
        );
      }
      throw error;
    }
  }

  @Put(':quackId/vote')
  @ApiOperation({
    summary: 'Vote in a poll, or change your vote',
    description:
      "Sets the signed-in user's one vote in this poll; sending it again changes nothing. Votes cannot be taken back.",
  })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 400, description: "Not one of this poll's answers" })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 404,
    description: 'No such quack, or it is not a poll',
  })
  async vote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: VoteDto,
  ): Promise<PollResponseDto> {
    try {
      return await this.quacksService.vote(user, quackId, {
        optionId: body.optionId,
        clientId: body.clientId,
        clientSeq: body.clientSeq,
      });
    } catch (error) {
      if (error instanceof PollNotFoundError) {
        throw new NotFoundException('This poll does not exist');
      }
      if (error instanceof NotAPollOptionError) {
        throw new BadRequestException("That answer isn't part of this poll");
      }
      throw error;
    }
  }
}
