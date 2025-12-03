import { Controller, Post, Body, Logger } from '@nestjs/common';
import { LocationService, LocationResponse } from './location.service';

@Controller('location')
export class LocationController {
  private readonly logger = new Logger(LocationController.name);

  constructor(private readonly locationService: LocationService) {}

  @Post()
  async getLocationState(
    @Body() body: { lat: number; long: number },
  ): Promise<LocationResponse> {
    this.logger.log(
      `[API] Request received for Lat: ${body.lat}, Long: ${body.long}`,
    );
    return this.locationService.getUserLocationState(body.lat, body.long);
  }
}
