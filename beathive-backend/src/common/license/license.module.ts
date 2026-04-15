// src/common/license/license.module.ts
import { Module } from '@nestjs/common';
import { LicenseService } from './license.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
