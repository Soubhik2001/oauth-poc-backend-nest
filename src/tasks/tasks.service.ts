import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Task } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // Accepts 'requestedRoleId' as a number
  async createPendingTaskForUser(
    userId: number,
    type: string,
    requestedRoleId: number,
  ): Promise<Task> {
    return this.prisma.task.create({
      data: {
        userId,
        type,
        status: 'pending',
        requestedRoleId: requestedRoleId,
      },
    });
  }

  async getTaskStatus(userId: number): Promise<string | null> {
    const task = await this.prisma.task.findFirst({
      where: { userId, type: 'ROLE_UPGRADE' },
      orderBy: { createdAt: 'desc' },
    });
    return task?.status ?? null;
  }

  // This handles the 'approve' and 'reject' logic
  async updateTaskStatus(
    userId: number,
    newStatus: 'approved' | 'rejected',
  ): Promise<Task> {
    // Find the pending task for this user
    const task = await this.prisma.task.findFirst({
      where: {
        userId: userId,
        status: 'pending',
        type: 'ROLE_UPGRADE',
      },
    });

    if (!task) {
      throw new NotFoundException(
        `No pending approval task found for user ${userId}`,
      );
    }

    if (newStatus === 'approved') {
      // Check if the task has a role ID
      if (!task.requestedRoleId) {
        throw new BadRequestException(
          'Task is incomplete and has no requested role ID.',
        );
      }

      // Use a transaction to update BOTH the User's role AND the Task status
      try {
        const [updatedTask] = await this.prisma.$transaction([
          // 1. Update the task
          this.prisma.task.update({
            where: { id: task.id },
            data: { status: 'approved' },
          }),
          // 2. Update the user's roleId to the one from the task
          this.prisma.user.update({
            where: { id: userId },
            data: { roleId: task.requestedRoleId },
          }),
        ]);
        return updatedTask;
      } catch (error) {
        throw new Error(`Transaction failed: ${error}`);
      }
    } else {
      // REJECT LOGIC
      return this.prisma.task.update({
        where: { id: task.id },
        data: { status: 'rejected' },
      });
    }
  }

  // Include the 'requestedRole' *object*
  async getPendingTasks() {
    return this.prisma.task.findMany({
      where: {
        status: 'pending',
        type: 'ROLE_UPGRADE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // This now fetches the full Role object via the relation
        requestedRole: true,
      },
    });
  }
}
