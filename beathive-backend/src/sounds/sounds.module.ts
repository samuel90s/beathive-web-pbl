// src/sounds/sounds.module.ts
import { Module } from '@nestjs/common';
import { SoundsService } from './sounds.service';
import { SoundsController } from './sounds.controller';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../common/storage/storage.module';
import { AudioService } from '../common/audio/audio.service';
import { EarningsModule } from '../earnings/earnings.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [StorageModule, ConfigModule, EarningsModule],
  controllers: [SoundsController],
  providers: [SoundsService, PrismaService, AudioService],
  exports: [SoundsService],
})
export class SoundsModule {}
