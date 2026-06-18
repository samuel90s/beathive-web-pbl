// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EmailModule, OrdersModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],  // PrismaService used by AdminService
})
export class AdminModule {}
