import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Task, Document } from '@prisma/client';
import { Mutex, MutexInterface } from 'async-mutex';
import * as fs from 'fs';
import * as path from 'path';

type TaskWithDocuments = Task & { documents: Document[] };

@Injectable()
export class TasksService {
  private readonly locks: Map<string, MutexInterface> = new Map();

  constructor(private prisma: PrismaService) {}

  private getLock(key: string): MutexInterface {
    if (!this.locks.has(key)) {
      this.locks.set(key, new Mutex());
    }
    return this.locks.get(key)!;
  }

  /**
   * HELPER: Aggressively cleans up ALL rejected tasks and files.
   */
  private async cleanupRejectedTasks(tasks: TaskWithDocuments[]) {
    if (!tasks || tasks.length === 0) return;

    console.log(`[Cleanup] Found ${tasks.length} rejected task(s) to delete.`);

    for (const task of tasks) {
      // 1. Delete physical files
      if (task.documents && task.documents.length > 0) {
        for (const doc of task.documents) {
          // Construct path. Ensure 'uploads' folder exists at root.
          const filePath = path.join(process.cwd(), 'uploads', doc.path);

          console.log(`[Cleanup] Attempting to delete file at: ${filePath}`);

          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[Cleanup] ✅ Success: Deleted file ${doc.path}`);
            } else {
              console.warn(`[Cleanup] ⚠️ File not found on disk: ${filePath}`);
            }
          } catch (err) {
            console.error(`[Cleanup] ❌ Error deleting file: ${err}`);
          }
        }
      }

      // 2. Delete Database Records
      // We delete documents first, then the task
      await this.prisma.document.deleteMany({ where: { taskId: task.id } });
      await this.prisma.task.delete({ where: { id: task.id } });
      console.log(`[Cleanup] ✅ Deleted Task ID ${task.id} from Database`);
    }
  }

  // ... (Keep createPendingTaskForUser, getTaskStatus, getPendingTasks, getLatestTaskForUser AS IS) ...

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
        state: 'open',
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

  async updateTaskStatus(
    userId: number,
    newStatus: 'approved' | 'rejected',
    adminId: number,
    comment?: string,
  ): Promise<Task> {
    const mutex = this.getLock(userId.toString());

    return await mutex.runExclusive(async () => {
      const task = await this.prisma.task.findFirst({
        where: {
          userId: userId,
          status: 'pending',
          type: 'ROLE_UPGRADE',
        },
      });

      if (!task) {
        throw new NotFoundException(
          `No pending approval task found for user ${userId}.`,
        );
      }

      const updateData = {
        status: newStatus,
        state: 'closed',
        comment: comment,
        actionById: adminId,
        actionAt: new Date(),
      };

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
              data: updateData,
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
        return this.prisma.task.update({
          where: { id: task.id },
          data: updateData,
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

  async getLatestTaskForUser(userId: number) {
    return this.prisma.task.findFirst({
      where: {
        userId: userId,
        type: 'ROLE_UPGRADE',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedRole: true,
        documents: true,
        actionBy: { select: { name: true } },
      },
    });
  }

  async resubmitApplication(
    userId: number,
    requestedRoleName: string,
    files: Array<Express.Multer.File>,
  ) {
    // 1. CHECK: Already Promoted?
    const alreadyApproved = await this.prisma.task.findFirst({
      where: { userId, status: 'approved', type: 'ROLE_UPGRADE' },
    });

    if (alreadyApproved) {
      throw new ForbiddenException(
        'You are already verified. Role promotion is only available to General Public users.',
      );
    }

    // 2. CHECK: Already Pending?
    const existingPending = await this.prisma.task.findFirst({
      where: { userId, status: 'pending', type: 'ROLE_UPGRADE' },
    });

    if (existingPending) {
      throw new BadRequestException(
        'You already have a pending application. Please wait for a response.',
      );
    }

    // 3. CLEANUP: Find ALL Rejected Tasks (Aggressive Clean)
    const rejectedTasks = await this.prisma.task.findMany({
      where: { userId, status: 'rejected', type: 'ROLE_UPGRADE' },
      include: { documents: true },
    });

    // If we found any, delete them all
    if (rejectedTasks.length > 0) {
      await this.cleanupRejectedTasks(rejectedTasks);
    } else {
      console.log('[Cleanup] No rejected tasks found to delete.');
    }

    // 4. Validate Role
    const role = await this.prisma.role.findUnique({
      where: { name: requestedRoleName },
    });

    if (!role) {
      throw new BadRequestException(
        `Role '${requestedRoleName}' does not exist.`,
      );
    }

    // 5. Create NEW Task
    return this.prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          userId,
          type: 'ROLE_UPGRADE',
          status: 'pending',
          state: 'open',
          requestedRoleId: role.id,
        },
      });

      if (files && files.length > 0) {
        const docPromises = files.map((file) =>
          tx.document.create({
            data: {
              filename: file.originalname,
              path: file.filename,
              mimetype: file.mimetype,
              taskId: newTask.id,
            },
          }),
        );
        await Promise.all(docPromises);
      }

      return newTask;
    });
  }
}
