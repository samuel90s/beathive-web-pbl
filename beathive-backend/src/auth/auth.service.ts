// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Register dengan email ──────────────────────────────

  async register(dto: RegisterDto) {
    // Cek email sudah dipakai
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Buat user + langsung assign free plan
    const freePlan = await this.prisma.plan.findUnique({
      where: { slug: 'free' },
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          provider: 'email',
          role: dto.role ?? 'USER',
        },
      });

      // Buat subscription free plan
      if (freePlan) {
        await tx.subscription.create({
          data: {
            userId: newUser.id,
            planId: freePlan.id,
            status: 'ACTIVE',
            currentPeriodEnd: new Date('2099-12-31'), // free plan tidak expire
          },
        });
      }

      return newUser;
    });

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── Login dengan email ─────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── Refresh access token ───────────────────────────────

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) throw new UnauthorizedException();

      const tokens = await this.generateTokens(user.id, user.email);
      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau expired');
    }
  }

  // ─── Google OAuth callback ──────────────────────────────

  async handleGoogleCallback(googleUser: {
    email: string;
    name: string;
    picture: string;
    googleId: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      // User baru via Google — buat akun + free plan
      const freePlan = await this.prisma.plan.findUnique({
        where: { slug: 'free' },
      });

      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: googleUser.name,
            email: googleUser.email,
            avatarUrl: googleUser.picture,
            provider: 'google',
            providerId: googleUser.googleId,
          },
        });

        if (freePlan) {
          await tx.subscription.create({
            data: {
              userId: newUser.id,
              planId: freePlan.id,
              status: 'ACTIVE',
              currentPeriodEnd: new Date('2099-12-31'),
            },
          });
        }

        return newUser;
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── Get current user (dari JWT) ───────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException();
    return this.sanitizeUser(user);
  }

  // ─── Update profile (name + bio) ───────────────────────

  async updateProfile(userId: string, dto: { name?: string; bio?: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name?.trim() && { name: dto.name.trim() }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
      },
    });
    return this.sanitizeUser(updated);
  }

  // ─── Upload avatar ──────────────────────────────────────

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${userId}${ext}`;
    const filepath = path.join(avatarsDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return { avatarUrl, user: this.sanitizeUser(updated) };
  }

  // ─── Change password ────────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (!user.passwordHash) {
      throw new BadRequestException('This account uses Google login — password change not available');
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new BadRequestException('Current password is incorrect');

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Password updated successfully' };
  }

  // ─── Helpers ────────────────────────────────────────────

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
