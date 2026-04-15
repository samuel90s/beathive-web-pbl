// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { LicenseModule } from '../common/license/license.module';

@Module({
  imports: [LicenseModule],
  controllers: [OrdersController],
  providers: [OrdersService, WebhookService, PrismaService],
})
export class OrdersModule {}
