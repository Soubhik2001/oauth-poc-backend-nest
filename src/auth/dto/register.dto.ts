import {
  IsString,
  IsEmail,
  MinLength,
  IsIn,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsString()
  @IsIn(['admin', 'epidemiologist', 'medical officer', 'general_public'])
  role: string;
}
