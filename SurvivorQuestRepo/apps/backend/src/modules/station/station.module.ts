import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StationController } from './station.controller';
import { StationService } from './station.service';

@Module({
  imports: [AuthModule],
  controllers: [StationController],
  providers: [StationService],
  exports: [StationService],
})
export class StationModule {}
