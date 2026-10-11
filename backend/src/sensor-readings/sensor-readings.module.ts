import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorReadingsController } from './sensor-readings.controller';
import { SensorReadingsService } from './sensor-readings.service';
import { SensorReading } from './sensor-reading.entity';
import { GeminiService } from '../gemini.service';
import { Device } from '../devices/device.entity';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensorReading, Device]),
    DevicesModule,
  ],
  controllers: [SensorReadingsController],
  providers: [SensorReadingsService, GeminiService],
})
export class SensorReadingsModule {}