// src/earnings/earnings.module.ts
import { Module } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { EarningsController } from './earnings.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [EarningsController],
  providers: [EarningsService, PrismaService],
  exports: [EarningsService],
})
export class EarningsModule {}
