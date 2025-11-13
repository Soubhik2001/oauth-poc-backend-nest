import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserRepository } from '../user/user.repository.js';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, UserRepository],
  exports: [AuthService],
})
export class AuthModule {}
