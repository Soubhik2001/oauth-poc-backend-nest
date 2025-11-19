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

export type UserWithRole = User & { role: Role };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(
    data: Omit<RegisterDto, 'confirmPassword'> & {
      password: string;
      roleId: number;
    },
  ): Promise<User> {
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

    // A. Check if user exists
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

    // D. Create User DIRECTLY (No Task, No Pending Status)
    return this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        country,
        roleId: role.id, // Assign the requested role immediately
      },
    });
  }
}
