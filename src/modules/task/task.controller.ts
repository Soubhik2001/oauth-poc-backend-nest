import {
  Body,
  Controller,
  Get,
  Put,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TaskService } from './task.service.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async getAllTasks() {
    return this.taskService.getTasks();
  }

  @Put('status')
  async modifyTaskStatus(@Body() dto: UpdateTaskStatusDto) {
    const { taskId, status } = dto;

    if (!taskId || !status) {
      throw new HttpException(
        'taskId and status are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.taskService.updateTaskStatus(taskId, status);
    if (!updated) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Task status updated successfully',
      task: updated,
    };
  }
}
