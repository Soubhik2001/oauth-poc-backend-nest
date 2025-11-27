import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard) // Secure the endpoints
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // API: GET /settings/:key
  // Example: GET /settings/MAX_FILE_SIZE
  @Get(':key')
  @Roles('superadmin') // Optional: or allow all admins to view
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  // API: PUT /settings/:key
  // Example: PUT /settings/MAX_FILE_SIZE
  // Body: { "value": "5242880" }
  @Put(':key')
  @Roles('superadmin') // STRICTLY SUPERADMIN ONLY
  async updateSetting(@Param('key') key: string, @Body('value') value: string) {
    return this.settingsService.updateSetting(key, value.toString());
  }
}
