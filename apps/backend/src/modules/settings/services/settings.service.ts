import {
  UsernameTakenError,
  UserSettings,
} from '@/modules/settings/domain/settings';
import { SettingsRepository } from '@/modules/settings/repositories/settings.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async getSettings(user: Identity): Promise<UserSettings> {
    return this.settingsRepository.getSettings(user.id);
  }

  async updateSettings(
    user: Identity,
    settings: UserSettings,
  ): Promise<UserSettings> {
    if (
      await this.settingsRepository.isUsernameTaken(settings.username, user.id)
    ) {
      throw new UsernameTakenError(settings.username);
    }
    return this.settingsRepository.updateSettings(user.id, settings);
  }
}
