import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleEnum } from '../common/constants/roles.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('pending')
  @Roles(RoleEnum.SUPER_ADMIN)
  async getPendingTasks() {
    return this.tasksService.getPendingTasks();
  }

  @Roles(RoleEnum.SUPER_ADMIN)
  @Post(':userId/approve')
  async approveTask(@Param('userId') userId: string) {
    const task = await this.tasksService.updateTaskStatus(
      parseInt(userId, 10),
      'approved',
    );
    if (!task) {
      throw new HttpException(
        'Pending task not found for this user.',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      message: `User ID ${userId} approved. Role permission granted.`,
      task,
    };
  }

  @Roles(RoleEnum.SUPER_ADMIN)
  @Post(':userId/reject')
  async rejectTask(@Param('userId') userId: string) {
    const task = await this.tasksService.updateTaskStatus(
      parseInt(userId, 10),
      'rejected',
    );
    if (!task) {
      throw new HttpException(
        'Pending task not found for this user.',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      message: `User ID ${userId} rejected. Role permission denied.`,
      task,
    };
  }
}
