import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role } from '@prisma/client';
import { RegisterDto } from '../auth/dto/register.dto';

// Define a type for the user object with its role included
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
    // Note: The roleId and hashed password are provided by the AuthService
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
      include: { role: true }, // Include role for authentication/authorization checks
    });
  }
}
