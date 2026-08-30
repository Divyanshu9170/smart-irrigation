import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './device.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { Crop } from '../crops/crop.entity';   // ✅ IMPORTANT
import { User } from '../users/user.entity';   // ✅ Feature 2 — device ownership
import { AutoAction } from '../auto-actions/auto-action.entity'; // ✅ Feature 5 — pump action log

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, Crop, User, AutoAction]),  // ✅ FIX HERE
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}