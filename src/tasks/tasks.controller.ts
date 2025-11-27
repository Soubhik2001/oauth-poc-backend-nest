import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Body,
  Req,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DynamicFileValidatorPipe } from '../common/pipes/dynamic-file-validator.pipe';

class UpdateTaskDto {
  comment: string;
}

// Interface for the Request User (from JWT Strategy)
interface RequestWithUser {
  user: {
    userId: number;
    email: string;
    roleName: string;
  };
}

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('pending')
  @Roles('superadmin')
  async getPendingTasks() {
    return this.tasksService.getPendingTasks();
  }

  @Roles('superadmin')
  @Post(':userId/approve')
  async approveTask(
    @Param('userId') userId: string,
    @Body() body: UpdateTaskDto,
    @Req() req: RequestWithUser, // Inject Request
  ) {
    // Pass the Admin's ID (req.user.userId) to the service
    const task = await this.tasksService.updateTaskStatus(
      parseInt(userId, 10),
      'approved',
      req.user.userId,
      body.comment,
    );
    return {
      message: `User ID ${userId} approved. Role permission granted.`,
      task,
    };
  }

  @Roles('superadmin')
  @Post(':userId/reject')
  async rejectTask(
    @Param('userId') userId: string,
    @Body() body: UpdateTaskDto,
    @Req() req: RequestWithUser, // Inject Request
  ) {
    // Pass the Admin's ID to the service
    const task = await this.tasksService.updateTaskStatus(
      parseInt(userId, 10),
      'rejected',
      req.user.userId,
      body.comment,
    );
    return {
      message: `User ID ${userId} rejected. Role permission denied.`,
      task,
    };
  }
  @Get('my-status')
  async getMyStatus(@Req() req: RequestWithUser) {
    return this.tasksService.getLatestTaskForUser(req.user.userId);
  }
  @Post('resubmit')
  @UseInterceptors(
    FilesInterceptor('documents', 5, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async resubmit(
    @Req() req: RequestWithUser,
    @Body('role') role: string, // User can change the role
    @UploadedFiles(DynamicFileValidatorPipe) files: Array<Express.Multer.File>,
  ) {
    const newTask = await this.tasksService.resubmitApplication(
      req.user.userId,
      role,
      files,
    );
    return { message: 'Application resubmitted successfully!', task: newTask };
  }
}
