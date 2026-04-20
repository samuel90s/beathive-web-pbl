// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { LicenseModule } from '../common/license/license.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EarningsModule } from '../earnings/earnings.module';

@Module({
  imports: [ConfigModule, LicenseModule, SubscriptionsModule, EarningsModule],
  controllers: [OrdersController],
  providers: [OrdersService, WebhookService, PrismaService],
})
export class OrdersModule {}
