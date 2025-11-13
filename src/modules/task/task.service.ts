import { Injectable, Logger } from '@nestjs/common';
import { TaskRepository } from './task.repository';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly taskRepo: TaskRepository) {}

  async createTask(data: { user_id: number; type: string; status?: string }) {
    return this.taskRepo.createTask(data);
  }

  async getTasks() {
    return this.taskRepo.getTasks();
  }

  async updateTaskStatus(taskId: number, status: string) {
    return this.taskRepo.updateTaskStatus(taskId, status);
  }
}
