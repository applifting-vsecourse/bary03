import {
  UsernameTakenError,
  UserSettings,
} from '@/modules/settings/domain/settings';
import { SettingsRepository } from '@/modules/settings/repositories/settings.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { mock } from 'jest-mock-extended';
import { SettingsService } from './settings.service';

const user = { id: 'u1' } as Identity;

const someSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  username: 'BreadCritic',
  name: 'The Bread Critic',
  bio: null,
  defaultMood: null,
  ...overrides,
});

describe('SettingsService', () => {
  it("returns the signed-in user's settings", async () => {
    const settings = someSettings();
    const repository = mock<SettingsRepository>();
    repository.getSettings.mockResolvedValue(settings);

    await expect(
      new SettingsService(repository).getSettings(user),
    ).resolves.toEqual(settings);
    expect(repository.getSettings).toHaveBeenCalledWith('u1');
  });

  it('saves settings for the signed-in user', async () => {
    const settings = someSettings({ bio: 'Crumbs.', defaultMood: 'happy' });
    const repository = mock<SettingsRepository>();
    repository.isUsernameTaken.mockResolvedValue(false);
    repository.updateSettings.mockResolvedValue(settings);

    await expect(
      new SettingsService(repository).updateSettings(user, settings),
    ).resolves.toEqual(settings);
    // the user's own current name doesn't count as taken
    expect(repository.isUsernameTaken).toHaveBeenCalledWith(
      'BreadCritic',
      'u1',
    );
    expect(repository.updateSettings).toHaveBeenCalledWith('u1', settings);
  });

  it('refuses a username someone else has', async () => {
    const repository = mock<SettingsRepository>();
    repository.isUsernameTaken.mockResolvedValue(true);

    await expect(
      new SettingsService(repository).updateSettings(user, someSettings()),
    ).rejects.toBeInstanceOf(UsernameTakenError);
    expect(repository.updateSettings).not.toHaveBeenCalled();
  });
});
