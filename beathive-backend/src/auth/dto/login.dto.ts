// src/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

// src/auth/dto/refresh-token.dto.ts
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
