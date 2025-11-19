import {
  IsString,
  IsEmail,
  MinLength,
  IsIn,
  IsOptional,
} from 'class-validator';
import { RoleEnum } from '../../common/constants/roles.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  country?: string;

  // Allow ALL roles, including superadmin
  @IsIn(Object.values(RoleEnum))
  role: string;
}
