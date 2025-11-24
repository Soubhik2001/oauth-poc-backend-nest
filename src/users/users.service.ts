import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';
import { User, Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { Mutex, MutexInterface } from 'async-mutex';

export type UserWithRole = User & { role: Role };

@Injectable()
export class UsersService {
  // Container for locks based on Email
  private readonly locks: Map<string, MutexInterface> = new Map();

  constructor(private prisma: PrismaService) {}

  //Helper to get or create a lock for a specific key
  private getLock(key: string): MutexInterface {
    if (!this.locks.has(key)) {
      this.locks.set(key, new Mutex());
    }
    return this.locks.get(key)!;
  }

  async createUser(
    data: Omit<RegisterDto, 'confirmPassword'> & {
      password: string;
      roleId: number;
    },
  ): Promise<User> {
    // Note: You might want to apply locking here too if public registration needs it.
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        country: data.country,
        roleId: data.roleId,
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
    const { email, password, role: roleName, name, country } = createUserDto;

    // Acquire Lock based on Email
    const mutex = this.getLock(email);

    // Run exclusively. If locked, 2nd request waits here.
    return await mutex.runExclusive(async () => {
      // A. DOUBLE-CHECK: Check if user exists (Must be inside the lock)
      // If Admin B was waiting, this check will now return TRUE and stop them.
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists.');
      }

      // B. Find the Role ID
      const role = await this.prisma.role.findUnique({
        where: { name: roleName },
      });
      if (!role) {
        throw new BadRequestException(`Role '${roleName}' does not exist.`);
      }

      // C. Hash Password
      const hashedPassword = await bcrypt.hash(password, 10);

      // D. Create User DIRECTLY
      return this.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          country,
          roleId: role.id,
        },
      });
    });
  }
}
