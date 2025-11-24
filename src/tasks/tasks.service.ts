import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Task } from '@prisma/client';
import { Mutex, MutexInterface } from 'async-mutex';

@Injectable()
export class TasksService {
  // Container for locks based on User ID
  private readonly locks: Map<string, MutexInterface> = new Map();

  constructor(private prisma: PrismaService) {}

  // Helper to get lock (convert number ID to string key)
  private getLock(key: string): MutexInterface {
    if (!this.locks.has(key)) {
      this.locks.set(key, new Mutex());
    }
    return this.locks.get(key)!;
  }

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
    comment?: string,
  ): Promise<Task> {
    // Lock based on userId.
    // This prevents two admins from acting on the same user's task simultaneously.
    const mutex = this.getLock(userId.toString());

    return await mutex.runExclusive(async () => {
      // DOUBLE-CHECK: Find the pending task INSIDE the lock
      const task = await this.prisma.task.findFirst({
        where: {
          userId: userId,
          status: 'pending', // Only look for PENDING tasks
          type: 'ROLE_UPGRADE',
        },
      });

      // If Admin A finished first, this will be null for Admin B
      if (!task) {
        throw new NotFoundException(
          `No pending approval task found for user ${userId}. It may have already been processed.`,
        );
      }

      if (newStatus === 'approved') {
        if (!task.requestedRoleId) {
          throw new BadRequestException(
            'Task is incomplete and has no requested role ID.',
          );
        }

        try {
          const [updatedTask] = await this.prisma.$transaction([
            this.prisma.task.update({
              where: { id: task.id },
              data: { status: 'approved', comment: comment },
            }),
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
          data: { status: 'rejected', comment: comment },
        });
      }
    });
  }

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
        requestedRole: true,
        documents: true,
      },
    });
  }
}
