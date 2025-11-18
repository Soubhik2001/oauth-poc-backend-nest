import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TasksService } from '../tasks/tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RoleEnum } from '../common/constants/roles.enum';
import { User, Role } from '@prisma/client';
import type { Express } from 'express';

export type AuthUser = User & { role: Role };

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tasksService: TasksService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
    files: Array<Express.Multer.File>,
  ): Promise<{ message: string }> {
    const { email, password, role: requestedRoleName } = registerDto;

    // Pre-check checks (fast fails)
    if (await this.usersService.findOneByEmail(email)) {
      throw new BadRequestException('User with this email already exists.');
    }

    const defaultRole = await this.prisma.role.findUnique({
      where: { name: RoleEnum.GENERAL_PUBLIC },
    });
    if (!defaultRole) {
      throw new BadRequestException(
        'General Public role not found. Please seed database.',
      );
    }

    // Check if docs are required BEFORE starting the transaction
    let roleUpgradeRequired = false;

    let requestedRoleRecord: Role | null = null;

    if (
      requestedRoleName !== String(RoleEnum.GENERAL_PUBLIC) &&
      requestedRoleName !== String(RoleEnum.SUPER_ADMIN)
    ) {
      roleUpgradeRequired = true;
      if (!files || files.length === 0) {
        throw new BadRequestException(
          'Identity documents are required for this role.',
        );
      }

      requestedRoleRecord = await this.prisma.role.findUnique({
        where: { name: requestedRoleName },
      });
      if (!requestedRoleRecord) {
        throw new BadRequestException(
          `The requested role '${requestedRoleName}' does not exist.`,
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // START TRANSACTION
    try {
      await this.prisma.$transaction(async (prismaTx) => {
        // Create User
        const user = await prismaTx.user.create({
          data: {
            name: registerDto.name,
            email: registerDto.email,
            password: hashedPassword,
            country: registerDto.country,
            roleId: defaultRole.id, // Always assign 'general public'
          },
        });

        // Handle Role Upgrade (Task + Documents)
        if (roleUpgradeRequired && requestedRoleRecord) {
          // Create Task
          const task = await prismaTx.task.create({
            data: {
              userId: user.id,
              type: 'ROLE_UPGRADE',
              status: 'pending',
              requestedRoleId: requestedRoleRecord.id,
            },
          });

          // Create Documents
          // We map the files to an array of promise creations to run them in parallel within the transaction
          const documentCreates = files.map((file) =>
            prismaTx.document.create({
              data: {
                filename: file.originalname,
                path: file.filename, // Multer filename (e.g., timestamp-random.pdf)
                mimetype: file.mimetype,
                taskId: task.id,
              },
            }),
          );

          await Promise.all(documentCreates);
        }
      });
    } catch (error) {
      // The User, Task, and Documents were all rolled back.
      console.error('Registration Transaction Failed:', error);
      throw new InternalServerErrorException(
        'Registration failed. Please try again.',
      );
    }

    // 4. Return Success Message
    if (roleUpgradeRequired) {
      return {
        message: `Registration successful as General Public. Your request for the '${requestedRoleName}' role is pending approval.`,
      };
    }

    return {
      message: 'Registration successful as General Public.',
    };
  }

  async validateUser(email: string, pass: string): Promise<AuthUser | null> {
    const userWithRole = await this.usersService.findOneByEmail(email);
    if (!userWithRole) return null;

    const isMatch = await bcrypt.compare(pass, userWithRole.password);
    return isMatch ? userWithRole : null;
  }

  async signIn(
    user: AuthUser,
  ): Promise<{ access_token: string; role: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      roleName: user.role.name,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      role: user.role.name,
    };
  }
}
