import { Controller, Post, Get, Param, UseGuards, Body } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleEnum } from '../common/constants/roles.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

class UpdateTaskDto {
  comment: string;
}

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
  async approveTask(
    @Param('userId') userId: string,
    @Body() body: UpdateTaskDto,
  ) {
    const task = await this.tasksService.updateTaskStatus(
      parseInt(userId, 10),
      'approved',
      body.comment,
    );
    return {
      message: `User ID ${userId} approved. Role permission granted.`,
      task,
    };
  }

  @Roles(RoleEnum.SUPER_ADMIN)
  @Post(':userId/reject')
  async rejectTask(
    @Param('userId') userId: string,
    @Body() body: UpdateTaskDto,
  ) {
    const task = await this.tasksService.updateTaskStatus(
      parseInt(userId, 10),
      'rejected',
      body.comment,
    );
    return {
      message: `User ID ${userId} rejected. Role permission denied.`,
      task,
    };
  }
}
