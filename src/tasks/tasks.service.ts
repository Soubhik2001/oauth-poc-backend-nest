import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Task } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async createPendingTaskForUser(
    userId: number,
    type: string = 'Role Approval',
  ): Promise<Task> {
    return this.prisma.task.create({
      data: {
        userId,
        type,
        status: 'pending',
      },
    });
  }

  /**
   * Finds the status of the 'Role Approval' task for a user.
   * Used by OauthService to check if authorization should be granted.
   */
  async getTaskStatus(userId: number): Promise<string | null> {
    const task = await this.prisma.task.findFirst({
      where: {
        userId: userId,
        type: 'Role Approval',
      },
    });

    return task ? task.status : null; // Returns 'pending', 'approved', 'rejected', or null
  }

  /**
   * Updates the status of a user's 'Role Approval' task.
   * Used by TasksController (the admin endpoint).
   */
  async updateTaskStatus(
    userId: number,
    newStatus: 'approved' | 'rejected',
  ): Promise<Task> {
    // Find the task first to get its unique ID
    const task = await this.prisma.task.findFirst({
      where: {
        userId: userId,
        type: 'Role Approval',
      },
    });

    if (!task) {
      throw new NotFoundException(`No approval task found for user ${userId}`);
    }

    // Update the task by its unique ID
    return this.prisma.task.update({
      where: {
        id: task.id,
      },
      data: {
        status: newStatus,
      },
    });
  }
}
