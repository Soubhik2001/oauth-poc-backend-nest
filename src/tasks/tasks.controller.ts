import {
  Controller,
  Post,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleEnum } from '../common/constants/roles.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserWithRole } from '../users/users.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  // Only Admins or Medical Officers can approve tasks
  @Roles(RoleEnum.ADMIN, RoleEnum.MEDICAL_OFFICER)
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

  @Roles(RoleEnum.ADMIN, RoleEnum.MEDICAL_OFFICER)
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
