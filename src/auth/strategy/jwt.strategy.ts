import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: number;
  email: string;
  roleName: string;
}

// Define a type for the validated payload (what gets attached to req.user)
type ValidatedPayload = {
  userId: number;
  email: string;
  roleName: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new InternalServerErrorException(
        'JWT_SECRET is not defined in .env file',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  // --- FIX: Removed 'async' and 'Promise<...>' ---
  /**
   * This method is called by Passport to validate the decoded JWT payload.
   * It runs synchronously since we trust the payload and don't need a DB lookup.
   * The return value is attached to req.user.
   */
  validate(payload: JwtPayload): ValidatedPayload {
    return {
      userId: payload.sub,
      email: payload.email,
      roleName: payload.roleName,
    };
  }
  // --- FIX END ---
}
