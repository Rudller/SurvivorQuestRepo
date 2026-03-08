import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealizationModule } from '../realization/realization.module';
import { StationModule } from '../station/station.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

@Module({
  imports: [AuthModule, RealizationModule, StationModule],
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule {}
