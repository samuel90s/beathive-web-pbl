// src/earnings/earnings.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('earnings')
@UseGuards(JwtAuthGuard)
export class EarningsController {
  constructor(private earningsService: EarningsService) {}

  // GET /earnings/wallet
  @Get('wallet')
  async getWallet(@CurrentUser() userId: string) {
    return this.earningsService.getWallet(userId);
  }

  // GET /earnings/analytics
  @Get('analytics')
  async getAnalytics(
    @CurrentUser() userId: string,
    @Query('months') months?: string,
  ) {
    return this.earningsService.getAnalytics(userId, months ? parseInt(months) : 12);
  }

  // POST /earnings/withdraw
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async requestWithdrawal(
    @CurrentUser() userId: string,
    @Body() body: { amountRp: number },
  ) {
    if (!body.amountRp || body.amountRp <= 0) {
      throw new BadRequestException('Invalid withdrawal amount');
    }
    try {
      return await this.earningsService.requestWithdrawal(userId, body.amountRp);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }
}
