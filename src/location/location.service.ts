import { Injectable, Logger } from '@nestjs/common';
import cities from 'all-the-cities';
import KDBush from 'kdbush';
import * as geokdbush from 'geokdbush';

// Response Interface
export interface LocationResponse {
  location: string;
}

const COUNTRY_MAP: Record<string, string> = {
  JM: 'Jamaica',
  BS: 'Bahamas',
  BB: 'Barbados',
  TT: 'Trinidad & Tobago',
  AG: 'Antigua & Barbuda',
  LC: 'Saint Lucia',
  PR: 'Puerto Rico',
  DO: 'Dominican Republic',
  HT: 'Haiti',
  CU: 'Cuba',
  KY: 'Cayman Islands',
  VI: 'US Virgin Islands',
  VG: 'British Virgin Islands',
  SX: 'Sint Maarten',
  AW: 'Aruba',
  CW: 'Curaçao',
  GD: 'Grenada',
  DM: 'Dominica',
  KN: 'Saint Kitts & Nevis',
  VC: 'St. Vincent & Grenadines',
  AI: 'Anguilla',
  MS: 'Montserrat',
  TC: 'Turks & Caicos',
  GP: 'Guadeloupe',
  MQ: 'Martinique',
  BL: 'St. Barthélemy',
  MF: 'St. Martin',
};

const CARIBBEAN_CODES = new Set(Object.keys(COUNTRY_MAP));

interface SimpleCity {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private index: KDBush;
  private caribbeanCities: SimpleCity[];

  constructor() {
    this.caribbeanCities = cities
      .filter((city) => CARIBBEAN_CODES.has(city.country))
      .map((city) => ({
        name: city.name,
        country: city.country,
        lat: city.loc.coordinates[1],
        lon: city.loc.coordinates[0],
      }));

    this.logger.log(
      `Indexing ${this.caribbeanCities.length} Caribbean cities...`,
    );

    this.index = new KDBush(
      this.caribbeanCities,
      (p: SimpleCity) => p.lon,
      (p: SimpleCity) => p.lat,
    );
  }

  getUserLocationState(lat: number, long: number): Promise<LocationResponse> {
    if (!this.index) return Promise.resolve({ location: 'Others' });

    const result = this.resolveLocation(lat, long);
    return Promise.resolve({ location: result });
  }

  private resolveLocation(lat: number, long: number): string {
    const nearestArray = geokdbush.around<SimpleCity>(this.index, long, lat, 1);

    const rawResult = nearestArray[0];
    let city: SimpleCity | undefined;

    if (typeof rawResult === 'number') {
      city = this.caribbeanCities[rawResult];
    } else {
      city = rawResult;
    }

    if (city) {
      this.logger.log(
        `[DEBUG] Found nearest city: ${city.name}, ${city.country}`,
      );

      const distKm = this.getDistanceFromLatLonInKm(
        lat,
        long,
        city.lat,
        city.lon,
      );
      this.logger.log(`[DEBUG] Distance to user: ${Math.round(distKm)} km`);

      if (distKm <= 10) {
        const countryName = COUNTRY_MAP[city.country] || city.country;
        const result = `${city.name}, ${countryName}`;
        this.logger.log(`[DEBUG] Match! Returning: ${result}`);
        return result;
      } else {
        this.logger.log(`[DEBUG] Too far (>10km). Returning 'Others'.`);
      }
    } else {
      this.logger.warn(`[DEBUG] No nearest city found in index.`);
    }

    return 'Others';
  }

  private getDistanceFromLatLonInKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
