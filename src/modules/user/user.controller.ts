import {
  Body,
  Controller,
  Post,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post('register')
  async registerUser(@Body() dto: CreateUserDto, @Res() res: Response) {
    try {
      const user = await this.userService.registerUser(dto);
      return res.status(HttpStatus.CREATED).json(user);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Register error', error.stack);
      } else {
        this.logger.error('Register error', JSON.stringify(error));
      }
    }
  }

  @Post('login')
  async loginUser(@Body() dto: LoginUserDto, @Res() res: Response) {
    try {
      const result = await this.userService.loginUser(dto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Login error', error.stack);
      } else {
        this.logger.error('Login error', JSON.stringify(error));
      }
    }
  }
}
