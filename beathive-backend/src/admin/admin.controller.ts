// src/admin/admin.controller.ts
import {
  Controller, Get, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, ForbiddenException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private prisma: PrismaService,
  ) {}

  // Guard: pastikan user adalah ADMIN
  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya admin yang bisa mengakses endpoint ini');
    }
  }

  // GET /admin/stats
  @Get('stats')
  async getStats(@CurrentUser() userId: string) {
    await this.assertAdmin(userId);
    return this.adminService.getStats();
  }

  // GET /admin/sounds?status=PENDING&page=1&limit=20
  @Get('sounds')
  async getSounds(
    @CurrentUser() userId: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    await this.assertAdmin(userId);
    return this.adminService.getSounds(status, Number(page), Number(limit));
  }

  // PATCH /admin/sounds/:id/approve
  @Patch('sounds/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveSound(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    await this.assertAdmin(userId);
    return this.adminService.approveSound(id, userId);
  }

  // PATCH /admin/sounds/:id/reject
  @Patch('sounds/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectSound(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() body: { reason: string },
  ) {
    await this.assertAdmin(userId);
    return this.adminService.rejectSound(id, userId, body.reason || 'Tidak memenuhi standar');
  }

  // GET /admin/users?search=&page=1&limit=20
  @Get('users')
  async getUsers(
    @CurrentUser() userId: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    await this.assertAdmin(userId);
    return this.adminService.getUsers(Number(page), Number(limit), search);
  }

  // GET /admin/withdrawals?status=PENDING&page=1&limit=20
  @Get('withdrawals')
  async getWithdrawals(
    @CurrentUser() userId: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    await this.assertAdmin(userId);
    return this.adminService.getWithdrawals(status, Number(page), Number(limit));
  }

  // PATCH /admin/withdrawals/:id
  @Patch('withdrawals/:id')
  @HttpCode(HttpStatus.OK)
  async updateWithdrawal(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() body: { status: 'PAID' | 'REJECTED'; note?: string },
  ) {
    await this.assertAdmin(userId);
    return this.adminService.updateWithdrawalStatus(id, body.status, body.note);
  }

  // GET /admin/orders?page=1&limit=20
  @Get('orders')
  async getOrders(
    @CurrentUser() userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    await this.assertAdmin(userId);
    return this.adminService.getOrders(Number(page), Number(limit));
  }
}
