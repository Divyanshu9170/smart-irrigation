import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { DevicesModule } from './devices/devices.module';
import { SensorReadingsModule } from './sensor-readings/sensor-readings.module'; // ✅ MUST
import { CropsModule } from './crops/crops.module';
import { AutoActionsModule } from './auto-actions/auto-actions.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'smartfarm.db',
      autoLoadEntities: true,
      synchronize: true,
    }),

    DevicesModule,
    SensorReadingsModule, // 🔥 MOST IMPORTANT
    CropsModule,
    AutoActionsModule,
  ],

  controllers: [AppController], // ✅ keep this
  providers: [AppService], // ✅ keep this
})
export class AppModule {}