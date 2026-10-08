import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoAction } from './auto-action.entity';
import { AutoActionsService } from './auto-actions.service';
import { AutoActionsController } from './auto-actions.controller';
import { Device } from '../devices/device.entity'; // ✅ Feature 3 — ownership check

@Module({
  imports: [TypeOrmModule.forFeature([AutoAction, Device])],
  providers: [AutoActionsService],
  controllers: [AutoActionsController],
})
export class AutoActionsModule {}
