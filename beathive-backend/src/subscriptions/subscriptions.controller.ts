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

  // DELETE /subscriptions/me  — cancel subscription
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@CurrentUser() userId: string) {
    return this.subscriptionsService.cancelSubscription(userId);
  }
}
