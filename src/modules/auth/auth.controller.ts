import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('oauth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('authorize')
  async authorize(@Body('userId') userId: string) {
    return { code: await this.authService.generateCode(userId) };
  }

  @Post('token')
  async token(@Body('code') code: string) {
    return { accessToken: await this.authService.exchangeCodeForToken(code) };
  }
}
