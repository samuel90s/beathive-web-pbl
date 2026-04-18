// src/subscriptions/subscriptions.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  // GET /subscriptions/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMySubscription(@CurrentUser() userId: string) {
    return this.subscriptionsService.getMySubscription(userId);
  }

  // POST /subscriptions/upgrade
  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  async upgradePlan(
    @CurrentUser() userId: string,
    @Body() body: { planSlug: string; billingCycle: 'monthly' | 'yearly' },
  ) {
    return this.subscriptionsService.upgradePlan(
      userId,
      body.planSlug,
      body.billingCycle,
    );
  }

  // POST /subscriptions/verify-payment
  // Dipanggil dari frontend di onSuccess Snap — cek status ke Midtrans lalu aktifkan
  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @CurrentUser() userId: string,
    @Body() body: { orderId: string },
  ) {
    return this.subscriptionsService.verifyAndActivate(userId, body.orderId);
  }

  // DELETE /subscriptions/me  — cancel subscription
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@CurrentUser() userId: string) {
    return this.subscriptionsService.cancelSubscription(userId);
  }
}
