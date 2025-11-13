import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { UserModule } from './modules/user/user.module.js';
import { TaskModule } from './modules/task/task.module.js';
import { RoleModule } from './modules/role/role.module.js';

@Module({
  imports: [PrismaModule, UserModule, TaskModule, RoleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
