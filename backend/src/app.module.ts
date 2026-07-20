import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { DevicesModule } from './devices/devices.module';
import { SensorReadingsModule } from './sensor-readings/sensor-readings.module';
import { CropsModule } from './crops/crops.module';
import { AutoActionsModule } from './auto-actions/auto-actions.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailModule } from './email/email.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',

      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),

      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      autoLoadEntities: true,
      synchronize: true,

      ssl: {
        rejectUnauthorized: false,
      },
    }),

    DevicesModule,
    SensorReadingsModule,
    CropsModule,
    AutoActionsModule,
    EmailModule,
    ContactModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}