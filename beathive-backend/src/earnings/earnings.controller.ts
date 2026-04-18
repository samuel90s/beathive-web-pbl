// src/earnings/earnings.controller.ts
import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
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

  // POST /earnings/withdraw
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async requestWithdrawal(
    @CurrentUser() userId: string,
    @Body() body: { amountRp: number; bankName: string; accountNo: string },
  ) {
    if (!body.amountRp || !body.bankName || !body.accountNo) {
      throw new BadRequestException('amountRp, bankName, dan accountNo wajib diisi');
    }
    return this.earningsService.requestWithdrawal(
      userId,
      body.amountRp,
      body.bankName,
      body.accountNo,
    );
  }
}
