import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from '../auth/dto/register.dto';

import { User, Role } from '@prisma/client';

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
}
