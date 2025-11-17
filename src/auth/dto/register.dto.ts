import {
  IsString,
  IsEmail,
  MinLength,
  IsIn,
  IsOptional,
  // ValidateIf,
} from 'class-validator';
// import { RoleEnum } from '../../common/constants/roles.enum';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  // --- FIX: REMOVED 'confirmPassword' ---
  // @ValidateIf(o => o.password)
  // @MinLength(6, { message: 'Passwords must match.' })
  // confirmPassword: string;
  // --- FIX END ---

  @IsOptional()
  @IsString()
  country?: string;

  @IsString()
  @IsIn(['admin', 'epidemiologist', 'medical officer', 'general_public'])
  role: string;
}
