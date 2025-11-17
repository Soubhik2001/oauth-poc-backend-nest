import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller'; // Import controller

@Module({
  controllers: [TasksController], // Register the controller
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
