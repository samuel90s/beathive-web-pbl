// src/earnings/earnings.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class WithdrawDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100_000_000)
  amountRp: number;
}

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
    const m = parseInt(months ?? '12', 10);
    const clamped = Number.isFinite(m) ? Math.max(1, Math.min(24, m)) : 12;
    return this.earningsService.getAnalytics(userId, clamped);
  }

  // POST /earnings/withdraw
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async requestWithdrawal(
    @CurrentUser() userId: string,
    @Body() body: WithdrawDto,
  ) {
    try {
      return await this.earningsService.requestWithdrawal(userId, Math.floor(body.amountRp));
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }
}
