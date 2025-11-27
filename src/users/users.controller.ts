import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post() // Maps to POST /api/users
  @Roles('superadmin') // Strict security
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createByAdmin(createUserDto);
    return {
      message: 'User created successfully.',
      user: {
        id: user.id,
        email: user.email,
        role: createUserDto.role,
      },
    };
  }
}
