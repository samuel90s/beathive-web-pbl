// src/admin/admin.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // GET /admin/stats
  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // GET /admin/sounds?status=PENDING&page=1&limit=20
  @Get('sounds')
  async getSounds(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getSounds(status, Number(page), Number(limit));
  }

  // PATCH /admin/sounds/:id/approve
  @Patch('sounds/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveSound(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
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
    return this.adminService.rejectSound(id, userId, body.reason || 'Tidak memenuhi standar');
  }

  // GET /admin/users?search=&page=1&limit=20
  @Get('users')
  async getUsers(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getUsers(Number(page), Number(limit), search);
  }

  // GET /admin/withdrawals?status=PENDING&page=1&limit=20
  @Get('withdrawals')
  async getWithdrawals(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getWithdrawals(status, Number(page), Number(limit));
  }

  // PATCH /admin/withdrawals/:id
  @Patch('withdrawals/:id')
  @HttpCode(HttpStatus.OK)
  async updateWithdrawal(
    @Param('id') id: string,
    @Body() body: { status: 'PAID' | 'REJECTED'; note?: string },
  ) {
    return this.adminService.updateWithdrawalStatus(id, body.status, body.note);
  }

  // GET /admin/orders?page=1&limit=20
  @Get('orders')
  async getOrders(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getOrders(Number(page), Number(limit));
  }

  // ─── Categories ──────────────────────────────────────────

  @Get('categories')
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string; slug: string; icon?: string }) {
    return this.adminService.createCategory(body.name, body.slug, body.icon);
  }

  @Patch('categories/:id')
  @HttpCode(HttpStatus.OK)
  async updateCategory(@Param('id') id: string, @Body() body: { name: string; slug: string; icon?: string }) {
    return this.adminService.updateCategory(id, body.name, body.slug, body.icon);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ─── Tags ────────────────────────────────────────────────

  @Get('tags')
  async getTags() {
    return this.adminService.getTags();
  }

  @Post('tags')
  async createTag(@Body() body: { name: string; slug: string }) {
    return this.adminService.createTag(body.name, body.slug);
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTag(@Param('id') id: string) {
    return this.adminService.deleteTag(id);
  }
}
