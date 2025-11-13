import { Module } from '@nestjs/common';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';
import { TaskRepository } from './task.repository.js';
import { PrismaService } from '../../database/prisma.service.js';

@Module({
  controllers: [TaskController],
  providers: [TaskService, TaskRepository, PrismaService],
})
export class TaskModule {}
