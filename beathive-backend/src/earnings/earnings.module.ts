// src/earnings/earnings.module.ts
import { Module } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { EarningsController } from './earnings.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [EarningsController],
  providers: [EarningsService, PrismaService],
  exports: [EarningsService],
})
export class EarningsModule {}
