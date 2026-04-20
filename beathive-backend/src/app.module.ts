// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { SoundsModule } from './sounds/sounds.module';
import { OrdersModule } from './orders/orders.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AdminModule } from './admin/admin.module';
import { EarningsModule } from './earnings/earnings.module';
import { EmailModule } from './email/email.module';
import { RatingsModule } from './ratings/ratings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EmailModule,
    AuthModule,
    SoundsModule,
    OrdersModule,
    SubscriptionsModule,
    AdminModule,
    EarningsModule,
    RatingsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
