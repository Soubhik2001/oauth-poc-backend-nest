import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from './user.repository.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { RoleRepository } from '../role/role.repository.js';
import { TaskRepository } from '../task/task.repository.js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
    private readonly taskRepo: TaskRepository,
  ) {}

  async registerUser(dto: CreateUserDto) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepo.getUserByEmail(dto.email);
      if (existingUser) {
        this.logger.warn(`User already exists with email: ${dto.email}`);
        throw new Error('User already exists');
      }

      // Create user
      const user = await this.userRepo.createUser(dto);

      // Role ID is a number in your schema
      const role = await this.roleRepo.getRoleById(Number(user.roleId));
      const roleName: string = (role?.name ?? '').toLowerCase();

      // Conditional task creation
      const taskRoles = ['admin', 'epidemiologist', 'medical_officer'];

      if (taskRoles.includes(roleName)) {
        this.logger.log(`Creating task for privileged role: ${roleName}`);

        await this.taskRepo.createTask({
          user_id: user.id,
          type: 'user_registration',
          status: 'pending',
        });
      }

      return user;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Error during registration:', error.stack);
        throw error;
      }
      throw new Error('Unknown error during registration');
    }
  }

  async loginUser(dto: LoginUserDto) {
    try {
      const { email, password } = dto;

      const user = await this.userRepo.getUserByEmail(email);
      if (!user) throw new Error('User not found');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid email or password');

      return {
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          country: user.country,
          role: user.role,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Error during login:', error.stack);
        throw error;
      }
      throw new Error('Unknown error during login');
    }
  }
}
