import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode, // <-- 1. Import HttpCode
  HttpStatus, // <-- 2. Import HttpStatus
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import type { RequestWithUser } from './auth.types';

@Controller('api/users')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  // --- FIX: Add @HttpCode(HttpStatus.OK) ---
  // This forces NestJS to return 200 OK instead of 201 Created
  @HttpCode(HttpStatus.OK)
  // --- FIX END ---
  async login(@Request() req: RequestWithUser) {
    return this.authService.signIn(req.user);
  }
}
