import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { TasksService } from '../tasks/tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { CompleteInviteDto } from './dto/complete-invite.dto';
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
    const { email, role: requestedRoleName } = registerDto;

    if (await this.usersService.findOneByEmail(email)) {
      throw new BadRequestException('User with this email already exists.');
    }

    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'general public' },
    });

    if (!defaultRole) throw new BadRequestException('Default role not found.');

    let roleUpgradeRequired = false;
    let requestedRoleRecord: Role | null = null;

    if (
      requestedRoleName !== 'general public' &&
      requestedRoleName !== 'superadmin'
    ) {
      roleUpgradeRequired = true;
      if (!files || files.length === 0) {
        throw new BadRequestException('Identity documents are required.');
      }
      requestedRoleRecord = await this.prisma.role.findUnique({
        where: { name: requestedRoleName },
      });
      if (!requestedRoleRecord) {
        throw new BadRequestException(
          `Role '${requestedRoleName}' does not exist.`,
        );
      }
    }

    // 1. GENERATE TOKEN (No Expiry)
    const token = crypto.randomBytes(32).toString('hex');

    try {
      await this.prisma.$transaction(async (prismaTx) => {
        const user = await prismaTx.user.create({
          data: {
            name: registerDto.name,
            email: registerDto.email,
            password: null,
            country: registerDto.country,
            roleId: defaultRole.id,
            inviteToken: token,
            inviteTokenExpiry: null,
          },
        });

        if (roleUpgradeRequired && requestedRoleRecord) {
          const task = await prismaTx.task.create({
            data: {
              userId: user.id,
              type: 'ROLE_UPGRADE',
              status: 'pending',
              requestedRoleId: requestedRoleRecord.id,
            },
          });

          const documentCreates = files.map((file) =>
            prismaTx.document.create({
              data: {
                filename: file.originalname,
                path: file.filename,
                mimetype: file.mimetype,
                taskId: task.id,
              },
            }),
          );
          await Promise.all(documentCreates);
        }
      });
    } catch (error) {
      console.error('Registration Transaction Failed:', error);
      throw new InternalServerErrorException('Registration failed.');
    }

    const deepLink = `carphaapp://setup?token=${token}`;

    console.log('----------------------------------------------------');
    console.log(`[MOBILE EMAIL MOCK] To: ${email}`);
    console.log(`[MOBILE EMAIL MOCK] Complete your registration in the app:`);
    console.log(deepLink);
    console.log('----------------------------------------------------');

    return {
      message: `Registration started. Please check your email to set your password.`,
    };
  }

  async completeInvite(dto: CompleteInviteDto): Promise<{ message: string }> {
    // 1. Find User by Token
    const user = await this.prisma.user.findUnique({
      where: { inviteToken: dto.token },
    });

    if (!user) {
      throw new NotFoundException('Invalid or used invitation link.');
    }

    if (user.email.toLowerCase() !== dto.email.toLowerCase()) {
      throw new UnauthorizedException('Invalid credentials provided.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        inviteToken: null,
        inviteTokenExpiry: null,
      },
    });

    return { message: 'Password set successfully. You can now log in.' };
  }

  async validateUser(email: string, pass: string): Promise<AuthUser | null> {
    const userWithRole = await this.usersService.findOneByEmail(email);
    if (!userWithRole || !userWithRole.password) return null;

    const isMatch = await bcrypt.compare(pass, userWithRole.password);
    return isMatch ? userWithRole : null;
  }

  async signIn(user: AuthUser) {
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
