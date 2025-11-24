import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Fetch a setting by its key (e.g., 'MAX_FILE_SIZE')
  async getSetting(key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    // Return value or default (e.g. 2MB) if not found
    return setting ? { key: setting.key, value: setting.value } : null;
  }

  // Update or Create a setting
  async updateSetting(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
