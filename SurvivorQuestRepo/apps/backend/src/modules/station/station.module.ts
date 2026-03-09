import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StationController } from './station.controller';
import { StationStorageService } from './station-storage.service';
import { StationService } from './station.service';

@Module({
  imports: [AuthModule],
  controllers: [StationController],
  providers: [StationService, StationStorageService],
  exports: [StationService, StationStorageService],
})
export class StationModule {}
