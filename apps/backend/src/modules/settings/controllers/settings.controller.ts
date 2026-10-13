import { UsernameTakenError } from '@/modules/settings/domain/settings';
import { SettingsService } from '@/modules/settings/services/settings.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  ConflictException,
  Controller,
  Get,
  Put,
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
import { SettingsResponseDto } from './dto/settings.response.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('settings')
@Controller('settings')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "The signed-in user's profile and preferences" })
  @ApiResponse({ status: 200, type: SettingsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async get(@User() user: Identity): Promise<SettingsResponseDto> {
    return SettingsResponseDto.fromDomain(
      await this.settingsService.getSettings(user),
    );
  }

  @Put()
  @ApiOperation({
    summary: "Replace the signed-in user's profile and preferences",
  })
  @ApiResponse({ status: 200, type: SettingsResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid settings' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 409, description: 'Username is already taken' })
  async update(
    @User() user: Identity,
    @Body() body: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    try {
      const settings = await this.settingsService.updateSettings(user, {
        username: body.username,
        name: body.name,
        // an empty bio is no bio
        bio: body.bio || null,
        defaultMood: body.defaultMood ?? null,
      });
      return SettingsResponseDto.fromDomain(settings);
    } catch (error) {
      if (error instanceof UsernameTakenError) {
        // `field` lets the client show the message next to the right input.
        throw new ConflictException({
          message: 'That username is already taken',
          field: 'username',
        });
      }
      throw error;
    }
  }
}
