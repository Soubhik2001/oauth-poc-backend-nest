import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
// This import will now work correctly:
import { AuthService, AuthUser } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Use email for the username field
    });
  }

  // Uses the email and password from the request body
  async validate(email: string, pass: string): Promise<AuthUser> {
    const user = await this.authService.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Return the AuthUser object, which Passport attaches to req.user
    return user;
  }
}
