import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { RoleRepository } from '../role/role.repository';
import { TaskRepository } from '../task/task.repository';
import { PrismaService } from 'src/database/prisma.service';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    RoleRepository,
    TaskRepository,
    PrismaService,
  ],
  exports: [UserService],
})
export class UserModule {}
