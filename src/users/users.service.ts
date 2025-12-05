import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from '../auth/dto/register.dto';
import * as crypto from 'crypto';
import { User, Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { Mutex, MutexInterface } from 'async-mutex';

export type UserWithRole = User & { role: Role };

@Injectable()
export class UsersService {
  private readonly locks: Map<string, MutexInterface> = new Map();

  constructor(private prisma: PrismaService) {}

  private getLock(key: string): MutexInterface {
    if (!this.locks.has(key)) {
      this.locks.set(key, new Mutex());
    }
    return this.locks.get(key)!;
  }

  async createUser(
    data: Omit<RegisterDto, 'confirmPassword'> & {
      password?: string;
      roleId: number;
      inviteToken?: string;
      inviteTokenExpiry?: Date;
    },
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password || null,
        country: data.country,
        roleId: data.roleId,
        inviteToken: data.inviteToken,
        inviteTokenExpiry: data.inviteTokenExpiry,
      },
    });
  }

  async findOneByEmail(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async createByAdmin(createUserDto: CreateUserDto): Promise<User> {
    const { email, role: roleName, name, country } = createUserDto;
    const mutex = this.getLock(email);

    return await mutex.runExclusive(async () => {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists.');
      }

      const role = await this.prisma.role.findUnique({
        where: { name: roleName },
      });
      if (!role) {
        throw new BadRequestException(`Role '${roleName}' does not exist.`);
      }
      const token = crypto.randomBytes(32).toString('hex');

      const newUser = await this.prisma.user.create({
        data: {
          name,
          email,
          password: null,
          country,
          roleId: role.id,
          inviteToken: token,
          inviteTokenExpiry: null,
        },
      });

      const webBaseUrl = process.env.WEB_ADMIN_URL || 'http://localhost:5173';
      const inviteLink = `${webBaseUrl}/setup-account?token=${token}`;

      console.log('----------------------------------------------------');
      console.log(`[EMAIL MOCK] To: ${email}`);
      console.log(`[EMAIL MOCK] Subject: Welcome to Carpha Admin`);
      console.log(`[EMAIL MOCK] Click here to set your password:`);
      console.log(inviteLink);
      console.log('----------------------------------------------------');

      return newUser;
    });
  }
}
