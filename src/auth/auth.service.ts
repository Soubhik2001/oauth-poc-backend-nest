import {
  Injectable,
  BadRequestException,
  // UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TasksService } from '../tasks/tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RoleEnum } from '../common/constants/roles.enum';
import { User, Role } from '@prisma/client';

export type AuthUser = User & { role: Role };

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tasksService: TasksService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password, role: requestedRoleName } = registerDto;

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

    const hashedPassword: string = await bcrypt.hash(password, 10);

    const user = await this.usersService.createUser({
      ...registerDto,
      password: hashedPassword,
      roleId: defaultRole.id,
    });

    if (
      requestedRoleName !== String(RoleEnum.GENERAL_PUBLIC) &&
      requestedRoleName !== String(RoleEnum.SUPER_ADMIN)
    ) {
      const requestedRoleRecord = await this.prisma.role.findUnique({
        where: { name: requestedRoleName },
      });

      if (!requestedRoleRecord) {
        throw new BadRequestException(
          `The requested role '${requestedRoleName}' does not exist.`,
        );
      }

      await this.tasksService.createPendingTaskForUser(
        user.id,
        'ROLE_UPGRADE',
        requestedRoleRecord.id,
      );
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

    if (!userWithRole) {
      return null; // User not found
    }

    const isMatch = await bcrypt.compare(pass, userWithRole.password);

    if (isMatch) {
      return userWithRole; // Password matches, login is valid
    } else {
      return null; // Password does not match
    }
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
