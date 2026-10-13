import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma, User as PrismaUser } from '@/generated/prisma/client';
import {
  UsernameTakenError,
  UserSettings,
} from '@/modules/settings/domain/settings';
import { Injectable, NotFoundException } from '@nestjs/common';

const mapPrismaUserToSettings = (user: PrismaUser): UserSettings => ({
  username: user.displayUsername ?? user.username ?? '',
  name: user.name,
  bio: user.bio,
  defaultMood: user.defaultMood,
});

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string): Promise<UserSettings> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException();
    }
    return mapPrismaUserToSettings(user);
  }

  /** Case-insensitive, so "BreadCritic" and "breadcritic" are the same name. */
  async isUsernameTaken(
    username: string,
    exceptUserId: string,
  ): Promise<boolean> {
    const owner = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        id: { not: exceptUserId },
      },
      select: { id: true },
    });
    return owner !== null;
  }

  async updateSettings(
    userId: string,
    settings: UserSettings,
  ): Promise<UserSettings> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          // BetterAuth's username plugin looks users up by the lowercased name
          // and keeps the spelling they chose in displayUsername.
          username: settings.username.toLowerCase(),
          displayUsername: settings.username,
          name: settings.name,
          bio: settings.bio,
          defaultMood: settings.defaultMood,
        },
      });
      return mapPrismaUserToSettings(user);
    } catch (error) {
      // Someone took the name between the check and the write.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new UsernameTakenError(settings.username);
      }
      throw error;
    }
  }
}
