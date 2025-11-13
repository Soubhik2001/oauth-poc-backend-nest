import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';
// import { RoleRepository } from '../role/role.repository.js';
// import { TaskRepository } from '../task/task.repository.js';
// import { PrismaService } from '../../database/prisma.service.js';
import { PrismaModule } from 'src/database/prisma.module.js';
import { RoleModule } from '../role/role.module.js';
import { TaskModule } from '../task/task.module.js';

@Module({
  imports: [PrismaModule, RoleModule, TaskModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    // RoleRepository,
    // TaskRepository,
    // PrismaService,
  ],
  exports: [UserService],
})
export class UserModule {}
