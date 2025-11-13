import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.types';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createUser({ name, email, role, country, password }: CreateUserDto) {
    try {
      const existingRole = await this.prisma.client.role.findUnique({
        where: { name: role },
      });

      if (!existingRole) {
        throw new Error(`Role "${role}" not found`);
      }

      const hashed = await bcrypt.hash(password, 10);

      const user = await this.prisma.client.user.create({
        data: {
          name,
          email,
          password: hashed,
          country,
          role: { connect: { id: existingRole.id } },
        },
        include: { role: true },
      });

      return user;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Error creating user:', error.stack);
      }
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    try {
      return await this.prisma.client.user.findUnique({
        where: { email },
        include: { role: true },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Error fetching user by email:', error.stack);
      }
      throw error;
    }
  }

  async getUserById(id: string) {
    try {
      const userId = Number(id);
      return await this.prisma.client.user.findUnique({
        where: { id: userId },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('Error fetching user by id:', error.stack);
      }
      throw error;
    }
  }

  async getUserByIdWithAcceptance(id: string): Promise<User | null> {
    const prismaUser = await this.prisma.client.user.findUnique({
      where: { id: Number(id) },
    });
    if (!prismaUser) return null;

    // Fetch acceptance from Task table
    const task = await this.prisma.client.task.findFirst({
      where: { userId: Number(id), status: 'ACCEPTED' },
    });

    return {
      id: prismaUser.id.toString(),
      email: prismaUser.email,
      password: prismaUser.password,
      isAccepted: !!task, // true if accepted task exists
    };
  }
}
