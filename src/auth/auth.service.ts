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

// This type is returned by LocalStrategy's validate()
export type AuthUser = User & { role: Role };

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tasksService: TasksService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 1. Registration (No changes here)
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password, role } = registerDto;

    if (await this.usersService.findOneByEmail(email)) {
      throw new BadRequestException('User with this email already exists.');
    }

    const dbRoleName =
      role === 'general_public' ? RoleEnum.GENERAL_PUBLIC : (role as RoleEnum);

    const roleRecord = await this.prisma.role.findUnique({
      where: { name: dbRoleName },
    });

    if (!roleRecord) {
      throw new BadRequestException('Invalid role specified.');
    }

    const hashedPassword: string = await bcrypt.hash(password, 10);

    const user = await this.usersService.createUser({
      ...registerDto,
      password: hashedPassword,
      roleId: roleRecord.id,
    });

    if (roleRecord.name !== String(RoleEnum.GENERAL_PUBLIC)) {
      await this.tasksService.createPendingTaskForUser(user.id);
      return {
        message: `Registration successful. An approval task is PENDING for your role: ${roleRecord.name}.`,
      };
    }

    return {
      message: 'Registration successful. You are registered as General Public.',
    };
  }

  // 2. Resource Owner Password Credentials Grant (Internal Validation)
  async validateUser(email: string, pass: string): Promise<AuthUser | null> {
    // --- DEBUGGING LOGS ---
    console.log(
      `[AuthService] validateUser: Attempting to validate user: ${email}`,
    );

    const userWithRole = await this.usersService.findOneByEmail(email);

    if (!userWithRole) {
      console.log(`[AuthService] validateUser: FAILED - User not found.`);
      return null;
    }

    console.log(
      `[AuthService] validateUser: User found. Comparing passwords...`,
    );

    const isMatch = await bcrypt.compare(pass, userWithRole.password);

    if (isMatch) {
      console.log(`[AuthService] validateUser: SUCCESS - Passwords match.`);
      return userWithRole;
    } else {
      console.log(
        `[AuthService] validateUser: FAILED - Passwords do not match.`,
      );
      return null;
    }
    // --- END DEBUGGING LOGS ---
  }

  // 3. Token Issuance (The Access Token Grant)
  async signIn(user: AuthUser): Promise<{ access_token: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      roleName: user.role.name,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
