import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { UserSettings } from '@/modules/settings/domain/settings';
import { ApiProperty } from '@nestjs/swagger';

export class SettingsResponseDto {
  @ApiProperty()
  username!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  defaultMood!: QuackMood | null;

  static fromDomain(settings: UserSettings): SettingsResponseDto {
    return {
      username: settings.username,
      name: settings.name,
      bio: settings.bio,
      defaultMood: settings.defaultMood,
    };
  }
}
