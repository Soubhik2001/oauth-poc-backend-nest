import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class TaskRepository {
  private readonly logger = new Logger(TaskRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTask({
    user_id,
    type,
    status = 'pending',
  }: {
    user_id: number;
    type: string;
    status?: string;
  }) {
    try {
      return await this.prisma.client.task.create({
        data: {
          userId: user_id,
          type,
          status,
        },
      });
    } catch (error) {
      this.logger.error('Error creating task:', error);
      throw error;
    }
  }

  async getTasks() {
    try {
      return await this.prisma.client.task.findMany({
        orderBy: { id: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: number, status: string) {
    try {
      return await this.prisma.client.task.update({
        where: { id: taskId },
        data: { status },
      });
    } catch (error: any) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2025'
      ) {
        throw new NotFoundException('Task not found');
      }
      this.logger.error('Error updating task status:', error);
      throw error;
    }
  }
}
