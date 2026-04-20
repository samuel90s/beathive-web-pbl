// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private emailService: EmailService,
  ) {}

  // POST /auth/register
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // max 5 register per menit
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // max 10 login per menit
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /auth/2fa/setup
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  async setup2FA(@CurrentUser() userId: string) {
    return this.authService.setup2FA(userId);
  }

  // POST /auth/2fa/verify
  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verify2FA(@CurrentUser() userId: string, @Body() body: { token: string }) {
    return this.authService.verify2FASetup(userId, body.token);
  }

  // POST /auth/2fa/disable
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disable2FA(@CurrentUser() userId: string, @Body() body: { password: string }) {
    return this.authService.disable2FA(userId, body.password);
  }

  // POST /auth/forgot-password
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email, this.emailService);
  }

  // POST /auth/reset-password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // POST /auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // GET /auth/me  — butuh JWT
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() userId: string) {
    return this.authService.getMe(userId);
  }

  // PATCH /auth/profile — update name & bio
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() userId: string,
    @Body() body: { name?: string; bio?: string },
  ) {
    return this.authService.updateProfile(userId, body);
  }

  // POST /auth/avatar — upload avatar image
  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'), false);
    },
  }))
  async uploadAvatar(
    @CurrentUser() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No file uploaded');
    return this.authService.updateAvatar(userId, file);
  }

  // POST /auth/change-password
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  // GET /auth/google  — redirect ke Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport otomatis redirect ke Google
  }

  // GET /auth/google/callback  — Google redirect ke sini
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const result = await this.authService.handleGoogleCallback(req.user);

    // Redirect ke frontend dengan token di query param
    // Di production: pakai httpOnly cookie atau fragment URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  }
}
