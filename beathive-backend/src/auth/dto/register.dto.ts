// src/auth/dto/register.dto.ts
import { IsEmail, IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsString()
  @IsIn(['USER', 'AUTHOR'])
  role?: string;
}
