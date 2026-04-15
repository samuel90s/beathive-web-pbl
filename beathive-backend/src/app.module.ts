// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { SoundsModule } from './sounds/sounds.module';
import { OrdersModule } from './orders/orders.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    SoundsModule,
    OrdersModule,
    SubscriptionsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
