// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}
